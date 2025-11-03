// js/game/Eidolon.js
class Eidolon {
    constructor(level, name, description, unlockCondition = null) {
        this.level = level; // 1-6
        this.name = name;
        this.description = description;
        this.unlockCondition = unlockCondition; // 解锁条件
        this.unlocked = false;
    }

    unlock() {
        this.unlocked = true;
    }

    // 应用星魂效果到角色
    applyEffect(character) {
        if (!this.unlocked) return;

        switch (this.level) {
            case 1:
                // 一魂效果
                this.applyEidolon1(character);
                break;
            case 2:
                // 二魂效果
                this.applyEidolon2(character);
                break;
            case 3:
                // 三魂效果 - 通常提升技能等级
                this.applyEidolon3(character);
                break;
            case 4:
                // 四魂效果
                this.applyEidolon4(character);
                break;
            case 5:
                // 五魂效果 - 通常提升终结技等级
                this.applyEidolon5(character);
                break;
            case 6:
                // 六魂效果
                this.applyEidolon6(character);
                break;
        }
    }

    // 子类需要重写这些方法
    applyEidolon1(character) {}
    applyEidolon2(character) {}
    applyEidolon3(character) {}
    applyEidolon4(character) {}
    applyEidolon5(character) {}
    applyEidolon6(character) {}
}

// 示例：钫酸的星魂
class FangsuanEidolon extends Eidolon {
    applyEidolon1(character) {
        // 一魂：量子共鸣触发概率提升至100%
        character.eidolonEffects.quantumResonanceRate = 1.0;
    }

    applyEidolon2(character) {
        // 二魂：死之剑溅射范围扩大
        character.eidolonEffects.deathSwordSpread = true;
    }

    applyEidolon3(character) {
        // 三魂：战技等级+2
        character.eidolonEffects.skillLevelBonus = 2;
    }

    applyEidolon4(character) {
        // 四魂：释放终结技后，立即获得一次额外行动
        character.onEvent('after_skill_execute', (event) => {
            if (event.data.skill.skillType === SkillType.ULTIMATE) {
                character.hasExtraAction = true;
            }
        });
    }

    applyEidolon5(character) {
        // 五魂：终结技等级+2
        character.eidolonEffects.ultimateLevelBonus = 2;
    }

    applyEidolon6(character) {
        // 六魂：量子共鸣附加伤害提升50%
        character.eidolonEffects.quantumResonanceBonus = 0.5;
    }
}

window.Eidolon = Eidolon;
window.FangsuanEidolon = FangsuanEidolon;