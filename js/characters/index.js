// index.js - 自动注册所有角色模板并可按需创建实例
(function() {
    console.log("开始自动注册角色...");

    // 检查 CharacterLoader 是否加载
    if (!window.CharacterLoader) {
        console.error("CharacterLoader 未定义，请确保 CharacterLoader.js 在此文件之前加载。");
        return;
    }

    /**
     * 注册所有角色模板（不立即创建实例）
     * @param {CharacterLoader} loader
     * @returns {void}
     */
    window.registerAllCharacters = function(loader) {
        // 检查各角色注册函数是否存在并注册模板
        const maybeRegisterTemplate = (fnName) => {
            const fn = window[fnName];
            if (typeof fn === "function") {
                // 调用注册函数以注册模板
                fn(loader);
            } else {
                console.warn(`⚠️ 未找到 ${fnName}()，请确认角色文件是否正确加载。`);
            }
        };

        // === 我方角色 ===
        // 注册模板（不创建实例）
        maybeRegisterTemplate("registerFangsuan");
        maybeRegisterTemplate("registerHuangmi");
        maybeRegisterTemplate("registerYushi");

        // === 敌方角色 ===
        maybeRegisterTemplate("registerAntimatterLegion");

        console.log(`✅ 已注册角色模板:`, Object.keys(loader.characterTemplates));
    };

    /**
     * 根据模板创建角色实例（例如战斗开始时）
     * @param {CharacterLoader} loader
     * @param {string[]} names 要创建的角色名称数组
     * @returns {Character[]} 创建的角色实例数组
     */
    window.createCharactersFromTemplates = function(loader, names) {
        if (!loader || !loader.characterTemplates) {
            console.error("❌ CharacterLoader 或模板数据无效。");
            return [];
        }

        const characters = [];
        for (const name of names) {
            const template = loader.characterTemplates[name];
            if (template) {
                const instance = loader.createCharacterInstance(name);
                if (instance) characters.push(instance);
            } else {
                console.warn(`⚠️ 未找到角色模板: ${name}`);
            }
        }

        console.log(`🎯 已创建 ${characters.length} 个角色实例:`, characters.map(c => c.name));
        return characters;
    };

})();