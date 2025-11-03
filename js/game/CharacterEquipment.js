// js/game/CharacterEquipment.js
class CharacterEquipment {
    constructor(character) {
        this.character = character;
        this.relics = {
            head: null,
            hands: null,
            body: null,
            feet: null,
            sphere: null,
            rope: null
        };
        this.eidolons = Array(6).fill(null); // 6个星魂位
        this.setBonuses = new Map(); // 存储套装效果
    }

    // 装备遗器
    equipRelic(relic, slot) {
        if (this.relics[slot]) {
            this.unequipRelic(slot);
        }
        
        this.relics[slot] = relic;
        this.updateSetBonuses();
        this.applyRelicStats();
    }

    // 卸下遗器
    unequipRelic(slot) {
        const relic = this.relics[slot];
        if (relic) {
            this.relics[slot] = null;
            this.updateSetBonuses();
            this.applyRelicStats();
            return relic;
        }
        return null;
    }

    // 更新套装效果
    updateSetBonuses() {
        this.setBonuses.clear();
        
        // 统计每个套装的装备数量
        const setCounts = new Map();
        Object.values(this.relics).forEach(relic => {
            if (relic && relic.set) {
                setCounts.set(relic.set, (setCounts.get(relic.set) || 0) + 1);
            }
        });

        // 应用套装效果
        setCounts.forEach((count, setName) => {
            const set = window.RelicSets[setName];
            if (set) {
                const effect = set.getSetEffect(count);
                if (effect) {
                    this.setBonuses.set(setName, effect);
                }
            }
        });
    }

    // 应用遗器属性
    applyRelicStats() {
        // 重置角色来自遗器的加成
        this.character.relicStats = {
            attack: 0,
            hp: 0,
            defense: 0,
            speed: 0,
            critRate: 0,
            critDamage: 0,
            breakEffect: 0,
            effectHitRate: 0,
            effectRes: 0
        };

        // 应用主属性
        Object.values(this.relics).forEach(relic => {
            if (relic) {
                const mainStatValue = relic.getMainStatValue();
                this.character.relicStats[relic.mainStat.type] += mainStatValue;
                
                // 应用副属性
                relic.getSubStatValues().forEach(stat => {
                    this.character.relicStats[stat.type] += stat.value;
                });
            }
        });

        // 应用套装效果
        this.setBonuses.forEach((effect, setName) => {
            effect.effect(this.character);
        });
    }

    // 解锁星魂
    unlockEidolon(level, eidolon) {
        if (level >= 1 && level <= 6) {
            this.eidolons[level - 1] = eidolon;
            eidolon.unlock();
            eidolon.applyEffect(this.character);
        }
    }

    // 获取已解锁星魂数量
    getUnlockedEidolonCount() {
        return this.eidolons.filter(e => e && e.unlocked).length;
    }
}

window.CharacterEquipment = CharacterEquipment;