import { motion, AnimatePresence } from 'framer-motion';
import { GamingPad } from '../icons';
import { useState } from 'react';
import { useStore } from '../components/StoreProvider';
import { showSuccess, showError } from '../utils/toast';

// Prompt 模板，方便用户快速创建
const PROMPT_TEMPLATES = [
    {
        name: 'MOBA 类',
        prompt: '保留英雄、技能和装备的缩写与简称\n使用MOBA游戏特有术语（如gank、推塔、团战）\n转换为选手间的简短指令\n保持游戏中的交流节奏',
    },
    {
        name: 'FPS 类',
        prompt: '保留武器和位置代号\n使用FPS战术简称和报点格式\n保留经济术语（如eco、force buy）\n转换为简短战术指令',
    },
    {
        name: 'MMO 类',
        prompt: '保留职业、技能和副本术语\n使用MMO社区常用缩写\n保持团队配合用语风格',
    },
    {
        name: '通用',
        prompt: '识别并保留游戏术语\n转换为玩家间常用表达\n保持游戏交流的简洁性',
    },
];

// 内置场景的默认 prompt，用于"恢复默认"功能
const BUILTIN_DEFAULT_PROMPTS = {
    lol: '英雄联盟游戏环境\n保留技能和装备简称\n使用赛事解说术语',
    dota2: '环境: DOTA2\n英雄简称（如ES=撼地神牛）\n物品缩写（如BKB）\n使用赛事解说术语\n保持团战节奏感',
    csgo: 'CS:GO游戏环境\n保留武器和位置代号\n使用标准战术用语',
    pubg: 'PUBG游戏环境\n保留武器和载具名称\n使用战术报点用语',
    apex: 'Apex Legends游戏环境\n保留传奇和技能名称\n使用战术简语',
    overwatch: '守望先锋游戏环境\n保留英雄和技能名称\n使用团队配合用语',
    valorant: 'Valorant游戏环境\n保留特工和技能名称\n使用FPS战术报点用语',
    fortnite: 'Fortnite游戏环境\n保留武器和建筑术语\n使用战术简语',
    minecraft: 'Minecraft游戏环境\n保留方块和物品名称\n使用社区常用表达',
    warzone: 'Warzone游戏环境\n保留武器和装备名称\n使用战术报点用语',
    wow: '魔兽世界游戏环境\n保留职业、技能和副本术语\n使用MMO社区常用表达',
};

export default function Scenes() {
    const { settings, updateSettings, scenes, updateScenes } = useStore();
    const activeSceneId = settings?.active_scene || 'dota2';

    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editPrompt, setEditPrompt] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPrompt, setNewPrompt] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    // 开始编辑场景
    const startEdit = (scene) => {
        setEditingId(scene.id);
        setEditName(scene.name);
        setEditPrompt(scene.prompt);
    };

    // 保存编辑
    const saveEdit = async () => {
        if (!editName.trim()) {
            showError('场景名称不能为空');
            return;
        }
        const updated = scenes.map(s =>
            s.id === editingId ? { ...s, name: editName.trim(), prompt: editPrompt.trim() } : s
        );
        await updateScenes(updated);
        setEditingId(null);
        showSuccess('场景已更新');
    };

    // 恢复内置场景的默认 prompt
    const resetToDefault = () => {
        if (BUILTIN_DEFAULT_PROMPTS[editingId]) {
            setEditPrompt(BUILTIN_DEFAULT_PROMPTS[editingId]);
            showSuccess('已恢复为默认 Prompt，点击保存生效');
        }
    };

    // 取消编辑
    const cancelEdit = () => {
        setEditingId(null);
    };

    // 删除自定义场景
    const deleteScene = async (id) => {
        const scene = scenes.find(s => s.id === id);
        if (scene?.is_builtin) {
            showError('内置场景不能删除');
            return;
        }
        const updated = scenes.filter(s => s.id !== id);
        // 如果删除的是当前激活的场景，切换到第一个
        if (activeSceneId === id && updated.length > 0) {
            await updateSettings({ active_scene: updated[0].id, game_scene: updated[0].id });
        }
        await updateScenes(updated);
        setConfirmDeleteId(null);
        showSuccess('场景已删除');
    };

    // 使用模板填充
    const applyTemplate = (template) => {
        setNewPrompt(template.prompt);
        showSuccess(`已应用「${template.name}」模板`);
    };

    // 添加新场景
    const addScene = async () => {
        if (!newName.trim()) {
            showError('请输入场景名称');
            return;
        }
        if (!newPrompt.trim()) {
            showError('请输入场景 Prompt');
            return;
        }
        const id = 'custom_' + Date.now();
        const newScene = {
            id,
            name: newName.trim(),
            prompt: newPrompt.trim(),
            is_builtin: false,
        };
        await updateScenes([...scenes, newScene]);
        setShowAddForm(false);
        setNewName('');
        setNewPrompt('');
        showSuccess('场景已添加');
    };

    // 切换激活场景
    const activateScene = async (id) => {
        await updateSettings({ active_scene: id, game_scene: id });
    };

    return (
        <div className="h-full flex flex-col gap-6">
            {/* 头部 */}
            <motion.div
                className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">游戏场景管理</h1>
                    <button
                        onClick={() => { setShowAddForm(true); setNewName(''); setNewPrompt(''); }}
                        className="px-4 py-2 text-sm text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                    >
                        + 添加场景
                    </button>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                    每个场景包含一段 Prompt，用于告诉 AI 当前的游戏环境和术语规则。点击场景卡片切换当前使用的场景，点击编辑可自定义 Prompt。
                </p>
            </motion.div>

            {/* 添加场景表单 */}
            <AnimatePresence>
                {showAddForm && (
                    <motion.div
                        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <div className="flex items-center gap-3 text-sm text-zinc-500 mb-4">
                            <GamingPad className="w-5 h-5 stroke-zinc-500" />
                            添加新场景
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-zinc-500 mb-2">场景名称</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300"
                                    placeholder="例如：永劫无间、原神、王者荣耀"
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm text-zinc-500">场景 Prompt</label>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-zinc-400">快速填充：</span>
                                        {PROMPT_TEMPLATES.map((tpl) => (
                                            <button
                                                key={tpl.name}
                                                onClick={() => applyTemplate(tpl)}
                                                className="px-2 py-0.5 text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                            >
                                                {tpl.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <textarea
                                    value={newPrompt}
                                    onChange={(e) => setNewPrompt(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 resize-none"
                                    placeholder={"每行写一条规则，描述游戏环境和术语要求，例如：\n永劫无间游戏环境\n保留英雄技能和武器名称\n使用近战格斗游戏术语"}
                                />
                                <p className="mt-1.5 text-xs text-zinc-400">
                                    💡 Prompt 会作为翻译上下文发送给 AI，写清楚游戏名称、需要保留的术语类型即可，不需要写得很复杂。
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={addScene}
                                    className="px-4 py-2 text-sm text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                                >
                                    确认添加
                                </button>
                                <button
                                    onClick={() => { setShowAddForm(false); setNewName(''); setNewPrompt(''); }}
                                    className="px-4 py-2 text-sm text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                >
                                    取消
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 场景列表 */}
            <div className="flex-1 overflow-auto space-y-3">
                {scenes.map((scene) => {
                    const isActive = scene.id === activeSceneId;
                    const isEditing = scene.id === editingId;
                    const isConfirmingDelete = scene.id === confirmDeleteId;

                    return (
                        <motion.div
                            key={scene.id}
                            className={`bg-white dark:bg-zinc-900 rounded-2xl p-5 border transition-all cursor-pointer ${
                                isActive
                                    ? 'border-zinc-900 dark:border-zinc-100 shadow-lg'
                                    : 'border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-zinc-300'
                            }`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => { if (!isEditing) activateScene(scene.id); }}
                        >
                            {isEditing ? (
                                /* 编辑模式 */
                                <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1">场景名称</label>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1">场景 Prompt</label>
                                        <textarea
                                            value={editPrompt}
                                            onChange={(e) => setEditPrompt(e.target.value)}
                                            rows={4}
                                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 resize-none"
                                        />
                                        <p className="mt-1 text-xs text-zinc-400">
                                            💡 每行写一条规则，描述游戏环境和需要保留的术语类型。
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={saveEdit}
                                            className="px-3 py-1.5 text-xs text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                                        >
                                            保存
                                        </button>
                                        <button
                                            onClick={cancelEdit}
                                            className="px-3 py-1.5 text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                        >
                                            取消
                                        </button>
                                        {scene.is_builtin && BUILTIN_DEFAULT_PROMPTS[scene.id] && (
                                            <button
                                                onClick={resetToDefault}
                                                className="px-3 py-1.5 text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors ml-auto"
                                            >
                                                恢复默认
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* 展示模式 */
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-semibold text-zinc-900 dark:text-white">{scene.name}</span>
                                            {isActive && (
                                                <span className="px-2 py-0.5 text-xs bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full">
                                                    当前使用
                                                </span>
                                            )}
                                            {scene.is_builtin && (
                                                <span className="px-2 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full">
                                                    内置
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-zinc-400 line-clamp-2">{scene.prompt}</p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => startEdit(scene)}
                                            className="p-1.5 text-xs text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                            title="编辑"
                                        >
                                            编辑
                                        </button>
                                        {!scene.is_builtin && (
                                            isConfirmingDelete ? (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => deleteScene(scene.id)}
                                                        className="px-2 py-1 text-xs text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                                                    >
                                                        确认
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        className="px-2 py-1 text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 transition-colors"
                                                    >
                                                        取消
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmDeleteId(scene.id)}
                                                    className="p-1.5 text-xs text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="删除"
                                                >
                                                    删除
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
