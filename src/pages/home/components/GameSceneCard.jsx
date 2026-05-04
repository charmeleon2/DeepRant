import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GamingPad, Repeat01, SwitchArrowHorizontal, IMac } from '../../../icons';
import { useStore } from '../../../components/StoreProvider';
import DropdownMenu from '../../../components/DropdownMenu';

export default function GameSceneCard() {
    const [showMenu, setShowMenu] = useState(false);
    const { settings, updateSettings, scenes } = useStore();

    const activeSceneId = settings?.active_scene || 'dota2';
    const isDaily = settings?.daily_mode || false;

    // 构建下拉菜单选项 { id: name }
    const gameOptions = useMemo(() => {
        const opts = {};
        scenes.forEach(s => { opts[s.id] = s.name; });
        return opts;
    }, [scenes]);

    const activeSceneName = scenes.find(s => s.id === activeSceneId)?.name || activeSceneId;

    const handleGameSelect = async (sceneId) => {
        setShowMenu(false);
        await updateSettings({ active_scene: sceneId, game_scene: sceneId });
    };

    const toggleDailyMode = async () => {
        await updateSettings({ daily_mode: !isDaily });
    };

    return (
        <motion.div
            className="relative h-full flex flex-col bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 text-left shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-zinc-500">
                    {isDaily ? (
                        <IMac className="w-6 h-6 stroke-zinc-500" />
                    ) : (
                        <GamingPad className="w-6 h-6 stroke-zinc-500" />
                    )}
                    {isDaily ? '日常模式' : '游戏模式'}
                </div>
                <div className="flex flex-col items-end">
                    <button
                        onClick={toggleDailyMode}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-colors ${isDaily
                            ? 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                            : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                            }`}
                    >
                        <span> {isDaily ? '游戏模式' : '日常模式'}</span>
                        <Repeat01 className="w-4 h-4 text-zinc-600 hover:text-zinc-600 transition-colors" />
                    </button>
                </div>
            </div>
            <div className="flex-1 flex flex-col justify-between mt-4">
                <div className="text-sm text-zinc-400">
                    {isDaily ? '划词翻译' : ' 合适的游戏场景选择，能保证翻译时更加符合游戏语境，如Moba类游戏中的推塔、gank，fps游戏中的rush等。'}

                </div>
                {!isDaily && (
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(true)}
                            className="px-4 py-1.5 rounded-lg bg-zinc-50 hover:bg-[#EAEAEA] transition-colors text-2xl font-semibold text-zinc-900 dark:text-white"
                        >
                            {activeSceneName}
                        </button>
                        <DropdownMenu
                            show={showMenu}
                            onClose={() => setShowMenu(false)}
                            options={gameOptions}
                            currentValue={activeSceneId}
                            onSelect={handleGameSelect}
                        />
                    </div>
                )}
            </div>
        </motion.div>
    );
} 