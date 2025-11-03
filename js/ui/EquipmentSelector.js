// js/ui/EquipmentSelector.js
class EquipmentSelector {
    constructor(characterLoader) {
        this.characterLoader = characterLoader;
        this.selectedCharacter = null;
        this.availableRelics = this.generateSampleRelics();
    }

    // 生成示例遗器
    generateSampleRelics() {
        return [
            new Relic("量子头冠", "head", 5, {type: "hp", value: 1000}, [
                {type: "attack", value: 50},
                {type: "critRate", value: 0.05}
            ], "QUANTUM_SET"),
            
            new Relic("骑士护手", "hands", 5, {type: "attack", value: 500}, [
                {type: "critDamage", value: 0.1},
                {type: "speed", value: 10}
            ], "KNIGHT_SET"),
            
            new Relic("火套躯干", "body", 5, {type: "defense", value: 300}, [
                {type: "hp", value: 200},
                {type: "critRate", value: 0.03}
            ], "FIRE_SET"),
            
            new Relic("量子脚部", "feet", 5, {type: "speed", value: 25}, [
                {type: "attack", value: 30},
                {type: "critDamage", value: 0.07}
            ], "QUANTUM_SET"),
            
            new Relic("骑士位面球", "sphere", 5, {type: "hp", value: 800}, [
                {type: "defense", value: 100},
                {type: "effectRes", value: 0.08}
            ], "KNIGHT_SET"),
            
            new Relic("火套连结绳", "rope", 5, {type: "attack", value: 400}, [
                {type: "speed", value: 15},
                {type: "breakEffect", value: 0.12}
            ], "FIRE_SET")
        ];
    }

    // 显示装备界面
    show(character) {
        this.selectedCharacter = character;
        this.render();
    }

    // 渲染装备界面
    render() {
        const container = document.querySelector('.container');
        
        const equipmentHTML = `
            <div id="equipment-selector" class="equipment-selector">
                <div class="equipment-header">
                    <h2>角色装备 - ${this.selectedCharacter.name}</h2>
                    <button class="close-btn" id="close-equipment">×</button>
                </div>
                
                <div class="equipment-layout">
                    <!-- 角色信息和当前装备 -->
                    <div class="character-equipment">
                        <h3>当前装备</h3>
                        <div class="equipment-slots">
                            ${this.renderEquipmentSlots()}
                        </div>
                        <div class="current-stats">
                            <h4>当前属性</h4>
                            ${this.renderCharacterStats()}
                        </div>
                    </div>
                    
                    <!-- 可用遗器列表 -->
                    <div class="available-relics">
                        <h3>可用遗器</h3>
                        <div class="relic-filters">
                            <select id="relic-set-filter">
                                <option value="all">全部套装</option>
                                <option value="QUANTUM_SET">量子套</option>
                                <option value="KNIGHT_SET">骑士套</option>
                                <option value="FIRE_SET">火套</option>
                            </select>
                            <select id="relic-type-filter">
                                <option value="all">全部部位</option>
                                <option value="head">头部</option>
                                <option value="hands">手部</option>
                                <option value="body">躯干</option>
                                <option value="feet">脚部</option>
                                <option value="sphere">位面球</option>
                                <option value="rope">连结绳</option>
                            </select>
                        </div>
                        <div class="relic-list" id="relic-list">
                            ${this.renderAvailableRelics()}
                        </div>
                    </div>
                    
                    <!-- 星魂界面 -->
                    <div class="eidolon-section">
                        <h3>星魂</h3>
                        <div class="eidolon-grid">
                            ${this.renderEidolons()}
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', equipmentHTML);
        this.bindEvents();
    }

    renderEquipmentSlots() {
        const slots = ['head', 'hands', 'body', 'feet', 'sphere', 'rope'];
        const slotNames = {
            head: '头部', hands: '手部', body: '躯干', 
            feet: '脚部', sphere: '位面球', rope: '连结绳'
        };

        return slots.map(slot => {
            const relic = this.selectedCharacter.equipment.relics[slot];
            return `
                <div class="equipment-slot" data-slot="${slot}">
                    <div class="slot-icon">${slotNames[slot]}</div>
                    ${relic ? `
                        <div class="equipped-relic">
                            <div class="relic-name">${relic.name}</div>
                            <div class="relic-set">${relic.set}</div>
                            <button class="unequip-btn" data-slot="${slot}">卸下</button>
                        </div>
                    ` : '<div class="empty-slot">空</div>'}
                </div>
            `;
        }).join('');
    }

    renderCharacterStats() {
        const character = this.selectedCharacter;
        return `
            <div class="stat-item">
                <span>攻击力:</span>
                <span class="stat-value">${Math.floor(character.getActualAttack())}</span>
            </div>
            <div class="stat-item">
                <span>防御力:</span>
                <span class="stat-value">${Math.floor(character.getActualDefense())}</span>
            </div>
            <div class="stat-item">
                <span>生命值:</span>
                <span class="stat-value">${Math.floor(character.getActualMaxHp())}</span>
            </div>
            <div class="stat-item">
                <span>速度:</span>
                <span class="stat-value">${Math.floor(character.getActualSpeed())}</span>
            </div>
            <div class="stat-item">
                <span>暴击率:</span>
                <span class="stat-value">${(character.critRate * 100).toFixed(1)}%</span>
            </div>
            <div class="stat-item">
                <span>暴击伤害:</span>
                <span class="stat-value">${(character.critDamage * 100).toFixed(0)}%</span>
            </div>
        `;
    }

    renderAvailableRelics() {
        return this.availableRelics.map((relic, index) => {
            const isEquipped = Object.values(this.selectedCharacter.equipment.relics)
                .some(r => r === relic);
            
            return `
                <div class="relic-item ${isEquipped ? 'equipped' : ''}" data-index="${index}">
                    <div class="relic-header">
                        <span class="relic-name">${relic.name}</span>
                        <span class="relic-rarity">${'★'.repeat(relic.rarity)}</span>
                    </div>
                    <div class="relic-type">${relic.type} - ${relic.set}</div>
                    <div class="relic-mainstat">
                        主属性: ${this.getStatText(relic.mainStat.type)} +${relic.getMainStatValue()}
                    </div>
                    <div class="relic-substats">
                        ${relic.getSubStatValues().map(stat => 
                            `<div>${this.getStatText(stat.type)} +${stat.value}</div>`
                        ).join('')}
                    </div>
                    ${!isEquipped ? `
                        <button class="equip-btn" data-index="${index}">装备</button>
                    ` : '<div class="equipped-tag">已装备</div>'}
                </div>
            `;
        }).join('');
    }

    renderEidolons() {
        // 根据角色名称创建对应的星魂
        const eidolonClass = this.getEidolonClass(this.selectedCharacter.name);
        const eidolons = [];
        
        for (let i = 1; i <= 6; i++) {
            const eidolon = new eidolonClass(i, `星魂 ${i}`, `星魂 ${i} 效果描述`);
            const isUnlocked = this.selectedCharacter.equipment.eidolons[i-1]?.unlocked;
            
            eidolons.push(`
                <div class="eidolon-item ${isUnlocked ? 'unlocked' : 'locked'}" data-level="${i}">
                    <div class="eidolon-level">${i}</div>
                    <div class="eidolon-info">
                        <div class="eidolon-name">${eidolon.name}</div>
                        <div class="eidolon-desc">${eidolon.description}</div>
                    </div>
                    ${!isUnlocked ? `
                        <button class="unlock-eidolon" data-level="${i}">解锁</button>
                    ` : '<div class="unlocked-tag">已解锁</div>'}
                </div>
            `);
        }
        
        return eidolons.join('');
    }

    getEidolonClass(characterName) {
        // 根据角色名称返回对应的星魂类
        const eidolonMap = {
            "钫酸": FangsuanEidolon,
        };
        return eidolonMap[characterName] || Eidolon;
    }

    getStatText(statType) {
        const statTexts = {
            'attack': '攻击力',
            'hp': '生命值',
            'defense': '防御力',
            'speed': '速度',
            'critRate': '暴击率',
            'critDamage': '暴击伤害',
            'breakEffect': '击破特攻',
            'effectHitRate': '效果命中',
            'effectRes': '效果抵抗'
        };
        return statTexts[statType] || statType;
    }

    bindEvents() {
        // 关闭按钮
        const closeBtn = document.getElementById('close-equipment');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.close();
            });
        }

        // 装备遗器
        document.querySelectorAll('.equip-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                const relic = this.availableRelics[index];
                const slot = relic.type;
                
                this.selectedCharacter.equipment.equipRelic(relic, slot);
                this.rerender();
            });
        });

        // 卸下遗器
        document.querySelectorAll('.unequip-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const slot = e.target.dataset.slot;
                this.selectedCharacter.equipment.unequipRelic(slot);
                this.rerender();
            });
        });

        // 解锁星魂
        document.querySelectorAll('.unlock-eidolon').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const level = parseInt(e.target.dataset.level);
                const eidolonClass = this.getEidolonClass(this.selectedCharacter.name);
                const eidolon = new eidolonClass(level, `星魂 ${level}`, `星魂 ${level} 效果描述`);
                
                this.selectedCharacter.equipment.unlockEidolon(level, eidolon);
                this.rerender();
            });
        });
    }

    rerender() {
        const selector = document.getElementById('equipment-selector');
        if (selector) {
            selector.remove();
        }
        this.render();
    }

    close() {
        const selector = document.getElementById('equipment-selector');
        if (selector) {
            selector.remove();
        }
    }
}

window.EquipmentSelector = EquipmentSelector;