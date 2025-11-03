// js/game/Relic.js
class Relic {
    constructor(name, type, rarity, mainStat, subStats = [], set = null) {
        this.name = name;
        this.type = type; // 'head', 'hands', 'body', 'feet', 'sphere', 'rope'
        this.rarity = rarity; // 1-5星
        this.mainStat = mainStat; // {type: 'hp', value: 1000}
        this.subStats = subStats; // [{type: 'attack', value: 50}, ...]
        this.set = set; // 套装名称
        this.level = 0;
        this.maxLevel = 15;
    }

    // 获取主属性值（考虑等级）
    getMainStatValue() {
        const baseValue = this.mainStat.value;
        const levelMultiplier = 1 + (this.level / this.maxLevel) * 0.8; // 每级提升8%
        return Math.floor(baseValue * levelMultiplier);
    }

    // 获取副属性值
    getSubStatValues() {
        return this.subStats.map(stat => ({
            type: stat.type,
            value: Math.floor(stat.value * (1 + this.level / this.maxLevel * 0.5))
        }));
    }

    // 升级遗器
    levelUp() {
        if (this.level < this.maxLevel) {
            this.level++;
            return true;
        }
        return false;
    }
}

// 遗器套装效果
class RelicSet {
    constructor(name, effects) {
        this.name = name;
        this.effects = effects; // {2: {效果描述}, 4: {效果描述}}
    }

    // 获取套装效果
    getSetEffect(pieceCount) {
        if (pieceCount >= 4 && this.effects[4]) {
            return this.effects[4];
        } else if (pieceCount >= 2 && this.effects[2]) {
            return this.effects[2];
        }
        return null;
    }
}

// 预定义遗器套装
window.RelicSets = {
    QUANTUM_SET: new RelicSet("量子套", {
        2: { description: "量子伤害提高10%", effect: (character) => {
            character.damageBonus.quantum = (character.damageBonus.quantum || 0) + 0.1;
        }},
        4: { description: "无视敌人20%防御", effect: (character) => {
            character.defenseIgnore += 0.2;
        }}
    }),

    KNIGHT_SET: new RelicSet("骑士套", {
        2: { description: "防御力提高15%", effect: (character) => {
            character.defensePercent += 0.15;
        }},
        4: { description: "护盾效果提高30%，受护盾保护时伤害提高20%", effect: (character) => {
            // 在护盾相关逻辑中处理
            character.relicEffects.knightShieldBonus = 0.3;
            character.relicEffects.knightDamageBonus = 0.2;
        }}
    }),

    FIRE_SET: new RelicSet("火套", {
        2: { description: "火伤害提高10%", effect: (character) => {
            character.damageBonus.fire = (character.damageBonus.fire || 0) + 0.1;
        }},
        4: { description: "技能伤害提高12%，终结技伤害提高12%", effect: (character) => {
            character.relicEffects.skillBonus = 0.12;
            character.relicEffects.ultimateBonus = 0.12;
        }}
    })
};

window.Relic = Relic;
window.RelicSet = RelicSet;