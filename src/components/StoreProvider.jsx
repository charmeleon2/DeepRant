import { createContext, useContext, useState, useEffect } from 'react';
import { load } from '@tauri-apps/plugin-store';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
    const [settingsStore, setSettingsStore] = useState(null);
    const [scenesStore, setScenesStore] = useState(null);
    const [settings, setSettings] = useState(null);
    const [scenes, setScenes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initStores = async () => {
            try {
                // 加载 settings.json
                const settingsInst = await load('settings.json', { autoSave: 100 });
                setSettingsStore(settingsInst);
                const storedSettings = await settingsInst.get('settings');
                if (storedSettings) {
                    setSettings(storedSettings);
                }

                // 加载 scenes.json
                const scenesInst = await load('scenes.json', { autoSave: 100 });
                setScenesStore(scenesInst);
                const storedScenes = await scenesInst.get('scenes');
                if (storedScenes) {
                    setScenes(storedScenes);
                }
            } catch (error) {
                console.error('初始化 store 失败:', error);
            } finally {
                setLoading(false);
            }
        };
        initStores();
    }, []);

    const updateSettings = async (newSettings) => {
        if (!settingsStore) return;
        const updatedSettings = { ...settings, ...newSettings };
        try {
            await settingsStore.set('settings', updatedSettings);
            await settingsStore.save();
            const storedSettings = await settingsStore.get('settings');
            if (storedSettings) {
                setSettings(storedSettings);
            }
        } catch (error) {
            console.error('更新设置失败:', error);
        }
    };

    const updateScenes = async (newScenes) => {
        if (!scenesStore) return;
        try {
            await scenesStore.set('scenes', newScenes);
            await scenesStore.save();
            const storedScenes = await scenesStore.get('scenes');
            if (storedScenes) {
                setScenes(storedScenes);
            }
        } catch (error) {
            console.error('更新场景失败:', error);
        }
    };

    return (
        <StoreContext.Provider value={{ settings, updateSettings, scenes, updateScenes, loading }}>
            {children}
        </StoreContext.Provider>
    );
}

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) {
        throw new Error('useStore 必须在 StoreProvider 内部使用');
    }
    return context;
};
