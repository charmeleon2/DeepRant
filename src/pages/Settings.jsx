import { motion } from 'framer-motion';
import { Server, Crown, Cube, InfoCircle } from '../icons';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '../components/StoreProvider';
import { showSuccess, showError } from '../utils/toast';

// 添加测试函数
const testOpenAIConnection = async (apiKey, baseUrl, modelName) => {
    try {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };

        const response = await fetch(`${baseUrl}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: modelName,
                messages: [
                    {
                        role: "user",
                        content: "Hello, this is a test message. Please reply with 'OK' if you receive this."
                    }
                ],
                max_tokens: 10
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || '未知错误');
        }

        if (data.choices && data.choices[0] && data.choices[0].message) {
            return true;
        }

        throw new Error('响应格式不正确');
    } catch (error) {
        throw new Error(`API测试失败: ${error.message}`);
    }
};

const MODEL_OPTIONS = [
    {
        id: 'custom',
        name: '自定义模型',
        modelName: 'custom'
    }
];

export default function Settings() {
    const { settings, updateSettings } = useStore();
    const [activeModel, setActiveModel] = useState(settings?.model_type || 'custom');
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        if (settings?.model_type) {
            setActiveModel(settings.model_type);
        }
    }, [settings?.model_type]);

    const handleModelChange = async (model) => {
        setActiveModel(model);
        await updateSettings({ model_type: model });
    };

    return (
        <div className="h-full flex flex-col gap-6">
            {/* 头部介绍区域 */}
            <motion.div
                className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">AI模型设置</h1>
                <p className="text-zinc-600 dark:text-zinc-400">
                    管理您的API配置和订阅信息。
                </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 模型选择卡片 */}
                <motion.div
                    className="flex flex-col bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] backdrop-blur-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-center gap-3 text-sm text-zinc-500 mb-6">
                        <Crown className="w-5 h-5 stroke-zinc-500" />
                        模型选择
                    </div>
                    <div className="space-y-3">
                        {MODEL_OPTIONS.map((model) => (
                            <button
                                key={model.id}
                                onClick={() => handleModelChange(model.id)}
                                className="w-full flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{model.name}</span>
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                                        <Cube className="w-3.5 h-3.5 stroke-zinc-500" />
                                        <span className="text-xs text-zinc-500">{model.modelName}</span>
                                    </div>
                                </div>
                                <div className={`w-4 h-4 rounded-full border transition-all ${activeModel === model.id
                                    ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_1px_2px_0_rgba(0,0,0,0.1)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_1px_2px_0_rgba(255,255,255,0.1)]'
                                    : 'border-zinc-300 dark:border-zinc-600'
                                    }`} />
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* 自定义API配置卡片 */}
                <motion.div
                    className="flex flex-col bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] backdrop-blur-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="flex items-center gap-3 text-sm text-zinc-500 mb-6">
                        <Server className="w-5 h-5 stroke-zinc-500" />
                        自定义API配置
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-zinc-500 mb-2">API Key</label>
                            <input
                                type="text"
                                disabled={activeModel !== 'custom'}
                                value={settings?.custom_model?.auth || ''}
                                onChange={(e) => updateSettings({
                                    custom_model: {
                                        ...settings?.custom_model,
                                        auth: e.target.value
                                    }
                                })}
                                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="输入你的API Key"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-zinc-500 mb-2">Base URL</label>
                            <input
                                type="text"
                                disabled={activeModel !== 'custom'}
                                value={settings?.custom_model?.api_url || ''}
                                onChange={(e) => updateSettings({
                                    custom_model: {
                                        ...settings?.custom_model,
                                        api_url: e.target.value
                                    }
                                })}
                                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="例如：https://api.openai.com/v1/chat/completions"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-zinc-500 mb-2">Model Name</label>
                            <input
                                type="text"
                                disabled={activeModel !== 'custom'}
                                value={settings?.custom_model?.model_name || ''}
                                onChange={(e) => updateSettings({
                                    custom_model: {
                                        ...settings?.custom_model,
                                        model_name: e.target.value
                                    }
                                })}
                                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="例如：gpt-3.5-turbo"
                            />
                        </div>
                        <div className="pt-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-zinc-400">
                                    {activeModel === 'custom' ? '请填写完整的API配置信息' : '选择自定义模型以启用配置'}
                                </p>
                                <button
                                    onClick={() => setShowHelp(!showHelp)}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <InfoCircle className="w-3.5 h-3.5 stroke-current" />
                                    {showHelp ? '收起帮助' : '填写帮助'}
                                </button>
                            </div>
                            {activeModel === 'custom' && (
                                <button
                                    onClick={async () => {
                                        if (!settings?.custom_model?.auth) {
                                            showError('请输入API Key');
                                            return;
                                        }
                                        if (!settings?.custom_model?.api_url) {
                                            showError('请输入API地址');
                                            return;
                                        }
                                        if (!settings?.custom_model?.model_name) {
                                            showError('请输入模型名称');
                                            return;
                                        }

                                        setIsTestingConnection(true);
                                        try {
                                            const result = await testOpenAIConnection(
                                                settings.custom_model.auth,
                                                settings.custom_model.api_url,
                                                settings.custom_model.model_name
                                            );
                                            if (result) {
                                                showSuccess('API连接测试成功！');
                                            }
                                        } catch (error) {
                                            showError(error.message);
                                        } finally {
                                            setIsTestingConnection(false);
                                        }
                                    }}
                                    disabled={isTestingConnection}
                                    className={`px-3 py-1.5 text-xs text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg transition-all flex items-center gap-2
                                        ${isTestingConnection
                                            ? 'opacity-70 cursor-not-allowed'
                                            : 'hover:bg-zinc-800 dark:hover:bg-zinc-200'}`}
                                >
                                    {isTestingConnection ? (
                                        <>
                                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                    fill="none"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                            测试中...
                                        </>
                                    ) : (
                                        '测试连接'
                                    )}
                                </button>
                            )}
                        </div>

                        {/* 帮助提示区域 */}
                        <AnimatePresence>
                            {showHelp && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3">
                                        <div>
                                            <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">⚠️ 格式说明</div>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                仅支持 OpenAI 兼容格式的 API（即 <code className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded text-xs">/v1/chat/completions</code> 接口），大多数主流大模型平台都兼容此格式。
                                            </p>
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-2">📋 常用 Base URL 参考</div>
                                            <div className="space-y-1.5">
                                                {[
                                                    { name: 'OpenAI', url: 'https://api.openai.com/v1/chat/completions' },
                                                    { name: 'DeepSeek', url: 'https://api.deepseek.com/v1/chat/completions' },
                                                    { name: '硅基流动', url: 'https://api.siliconflow.cn/v1/chat/completions' },
                                                    { name: '阿里百炼', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions' },
                                                    { name: '月之暗面 (Kimi)', url: 'https://api.moonshot.cn/v1/chat/completions' },
                                                    { name: '智谱 (GLM)', url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions' },
                                                ].map((item) => (
                                                    <div key={item.name} className="flex items-start gap-2 text-xs">
                                                        <span className="text-zinc-500 dark:text-zinc-400 shrink-0 w-20">{item.name}</span>
                                                        <code
                                                            className="text-zinc-600 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded break-all cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(item.url);
                                                                showSuccess(`已复制 ${item.name} 的 Base URL`);
                                                            }}
                                                            title="点击复制"
                                                        >
                                                            {item.url}
                                                        </code>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-xs text-zinc-400 mt-2">💡 点击地址可直接复制</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </div>
    );
} 