use anyhow::Result;
use reqwest::Client;
use serde_json::{json, Value};
use tauri::AppHandle;

fn get_system_prompt(settings: &crate::store::AppSettings, scenes: &[crate::store::GameScene]) -> String {
    let from = &settings.translation_from;
    let to = &settings.translation_to;
    let mode = &settings.translation_mode;

    if settings.daily_mode {
        return format!(
            r#"<task>将用户输入从【{}】翻译到【{}】</task>

<requirements>
1. 直接输出翻译结果，禁止任何解释
2. 单句长度控制在15-25字
3. 确保口语化自然表达
4. 禁止重复/冗余内容
5. 保留数字和专有名词
</requirements>

<style>
• 生活化口语表达
• 符合日常交流习惯
• 自然流畅不生硬
</style>

<output_format>
仅输出一条最终翻译结果，不要包含任何思考过程或解释
</output_format>"#,
            from, to
        );
    }

    let base = format!(
        r#"<task>将游戏内文字从【{}】翻译到【{}】</task>

<constraints>
• 标点限制: ≤5个符号
• 禁止换行
• 禁止Markdown
• 禁止特殊符号
</constraints>

<terms>
• 保留原始游戏术语
• 使用官方译名
• 维持缩写格式
</terms>"#,
        from, to
    );

    let mode_desc = match mode.as_str() {
        "toxic" => {
            r#"<toxic_style>
• 翻译用户原文，可适当追加一句犀利嘲讽
• 使用游戏社区老玩家的口吻进行毒舌攻击
• 融入游戏场景梗和双重隐喻
• 符号化敏感词（如f*ck/cl@ssic）
• 语气要有压迫感，让对手破防
</toxic_style>

<references>
根据目标语言选择对应的游戏社区风格：
• 英语：Reddit/4chan/COD lobby 风格
• 日语：2ch/ニコニコ 掲示板风格
• 韩语：디시인사이드/롤 갤风格
• 中文：百度贴吧/NGA 风格
• 其他语言：该语言游戏社区中常见的攻击性俚语风格
</references>

<rules>
• 每条添加1个战术术语（noob/camping）
• 使用FPS/MOBA黑话重构
</rules>"#
                .to_string()
        }
        "pro" => {
            r#"<pro_style>
• 赛事解说风格
• 选手交流简语
• 极简短句，能一眼扫完
• 使用目标语言的通用战术缩写和电竞术语
</pro_style>

<rhythm>
• 去除冗余修饰词
• 信息密度优先
</rhythm>"#
                .to_string()
        }
        _ => {
            r#"<default_style>
• 准确自然，简洁直接
• 符合游戏内即时交流习惯
• 不过度修饰，不过度口语化
• 保持原文语气和意图
</default_style>"#
                .to_string()
        }
    };

    // 从 scenes 中查找当前场景的 prompt，找不到则使用通用描述
    let scene_prompt = scenes
        .iter()
        .find(|s| s.id == settings.active_scene)
        .map(|s| s.prompt.clone())
        .unwrap_or_else(|| "通用游戏环境\n识别常见游戏用语\n保持游戏交流特点".to_string());

    let scene_desc = format!(
        "<context>\n{}\n</context>",
        scene_prompt
            .lines()
            .map(|line| format!("• {}", line))
            .collect::<Vec<_>>()
            .join("\n")
    );

    format!(
        r#"{}
{}
{}

<compliance>
• 严格长度校验
• 术语一致性检查
• 敏感词二次过滤
• 输出格式终检
</compliance>

<output_format>
仅输出一条最终翻译结果，不要包含任何思考过程或解释
</output_format>"#,
        base, mode_desc, scene_desc
    )
}

fn get_model_config(settings: &crate::store::AppSettings) -> crate::store::ModelConfig {
    settings.custom_model.clone()
}

pub async fn translate_with_gpt(app: &AppHandle, original: &str) -> Result<String> {
    let settings = crate::store::get_settings(app)?;
    let scenes = crate::store::get_scenes(app)?;
    println!("当前翻译设置:");
    println!("- 源语言: {}", settings.translation_from);
    println!("- 目标语言: {}", settings.translation_to);
    println!("- 游戏场景: {}", settings.active_scene);
    println!("- 翻译模式: {}", settings.translation_mode);
    println!("- 日常模式: {}", settings.daily_mode);

    let model_config = get_model_config(&settings);

    println!("正在发送请求到: {}", model_config.api_url);
    println!("使用的模型: {}", model_config.model_name);
    if model_config.auth.len() >= 6 {
        println!("API密钥前缀: {}...", &model_config.auth[..6]);
    }

    let system_prompt = get_system_prompt(&settings, &scenes);

    let client = Client::new();

    // 根据翻译模式动态调整参数
    let (temperature, frequency_penalty) = match settings.translation_mode.as_str() {
        "toxic" => (0.9, 0.0),   // 嘴臭模式：高随机性，更有创意
        "pro" => (0.5, 0.0),     // 职业玩家：稳定简洁
        _ => (0.6, 0.0),         // 自动模式：适中平衡
    };

    let request_body = json!({
        "model": model_config.model_name,
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": original
            }
        ],
        "max_tokens": 300,
        "temperature": temperature,
        "top_p": 0.7,
        "n": 1,
        "stream": false,
        "presence_penalty": 0.3,
        "frequency_penalty": frequency_penalty
    });

    let response = match client
        .post(&model_config.api_url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", model_config.auth))
        .json(&request_body)
        .send()
        .await
    {
        Ok(resp) => match resp.json::<Value>().await {
            Ok(json) => {
                // 先检查是否有错误信息
                if let Some(error) = json.get("error_msg").and_then(|msg| msg.as_str()) {
                    println!("API返回错误: {}", error);
                    return Ok(format!("[错误] {}", error));
                }
                json
            }
            Err(e) => {
                println!("解析响应JSON失败: {}", e);
                return Ok(format!("[错误] 服务器响应格式异常: {}", e));
            }
        },
        Err(e) => {
            let error_msg = match e.to_string().as_str() {
                msg if msg.contains("connection refused") => "无法连接到API服务器，请检查网络设置",
                msg if msg.contains("timeout") => "请求超时，请检查网络连接",
                msg if msg.contains("certificate") => "SSL证书验证失败，请检查网络设置",
                _ => "网络请求失败",
            };
            println!("请求失败: {}", e);
            return Ok(format!("[错误] {}", error_msg));
        }
    };

    // 解析响应
    println!("API响应原文: {:?}", response);
    let translated = match response
        .get("choices")
        .and_then(|choices| choices.as_array())
        .and_then(|choices| choices.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|message| message.get("content"))
        .and_then(|content| content.as_str())
    {
        Some(text) => {
            let text = text.trim();
            // 如果找到</think>标签，只保留其后内容
            if let Some(end_pos) = text.find("</think>") {
                text[(end_pos + 8)..].trim().to_string()
            } else {
                text.to_string()
            }
        }
        None => {
            println!("无法从响应中提取翻译结果: {:?}", response);
            return Ok("[错误] 服务器返回的数据格式异常".to_string());
        }
    };

    Ok(translated)
}
