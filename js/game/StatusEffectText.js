// js/game/StatusEffectText.js

window.getStatusEffectText = function (effect) {
    const lines = [];

    // 基础属性加成
    if (effect.attackBonus) lines.push(`攻击力${effect.attackBonus > 0 ? '+' : ''}${Math.floor(effect.attackBonus)}`);
    if (effect.defenseBonus) lines.push(`防御力${effect.defenseBonus > 0 ? '+' : ''}${Math.floor(effect.defenseBonus)}`);
    if (effect.speedBonus) lines.push(`速度${effect.speedBonus > 0 ? '+' : ''}${Math.floor(effect.speedBonus)}`);

    // 百分比属性加成
    if (effect.attackPercent) lines.push(`攻击力${effect.attackPercent > 0 ? '+' : ''}${(effect.attackPercent * 100).toFixed(1)}%`);
    if (effect.defensePercent) lines.push(`防御力${effect.defensePercent > 0 ? '+' : ''}${(effect.defensePercent * 100).toFixed(1)}%`);

    // 伤害加成
    if (effect.damageBonus) lines.push(`全伤害${effect.damageBonus > 0 ? '+' : ''}${(effect.damageBonus * 100).toFixed(1)}%`);
    if (effect.basicAttackBonus) lines.push(`普通攻击伤害+${(effect.basicAttackBonus * 100).toFixed(1)}%`);
    if (effect.skillBonus) lines.push(`战技伤害+${(effect.skillBonus * 100).toFixed(1)}%`);
    if (effect.ultimateBonus) lines.push(`终结技伤害+${(effect.ultimateBonus * 100).toFixed(1)}%`);
    if (effect.followUpBonus) lines.push(`追击伤害+${(effect.followUpBonus * 100).toFixed(1)}%`);

    // 属性伤害
    const damageTypeBonuses = [];
    if (effect.fireBonus) damageTypeBonuses.push(`火+${(effect.fireBonus * 100).toFixed(1)}%`);
    if (effect.iceBonus) damageTypeBonuses.push(`冰+${(effect.iceBonus * 100).toFixed(1)}%`);
    if (effect.lightningBonus) damageTypeBonuses.push(`雷+${(effect.lightningBonus * 100).toFixed(1)}%`);
    if (effect.windBonus) damageTypeBonuses.push(`风+${(effect.windBonus * 100).toFixed(1)}%`);
    if (effect.physicalBonus) damageTypeBonuses.push(`物理+${(effect.physicalBonus * 100).toFixed(1)}%`);
    if (effect.quantumBonus) damageTypeBonuses.push(`量子+${(effect.quantumBonus * 100).toFixed(1)}%`);
    if (effect.imaginaryBonus) damageTypeBonuses.push(`虚数+${(effect.imaginaryBonus * 100).toFixed(1)}%`);
    if (damageTypeBonuses.length > 0) lines.push(`属性伤害: ${damageTypeBonuses.join(', ')}`);

    // 易伤、防御
    if (effect.damageTakenBonus) lines.push(`受到伤害${effect.damageTakenBonus > 0 ? '+' : ''}${(effect.damageTakenBonus * 100).toFixed(1)}%`);
    if (effect.vulnerability) lines.push(`易伤+${(effect.vulnerability * 100).toFixed(1)}%`);
    if (effect.damageReduction) lines.push(`伤害减免${(effect.damageReduction * 100).toFixed(1)}%`);
    if (effect.defenseIgnore) lines.push(`无视防御${(effect.defenseIgnore * 100).toFixed(1)}%`);

    // 特殊状态
    if (effect.isSilenced) lines.push('● 无法使用技能');
    if (effect.isStunned) lines.push('● 无法行动');
    if (effect.isFrozen) lines.push('● 无法行动');
    if (effect.isImmuneDeath) lines.push('● 免疫致命伤害');
    if (effect.isBurned) lines.push('● 每回合受到持续伤害');
    if (effect.isShocked) lines.push('● 受到伤害增加');

    // 特殊效果
    switch (effect.name) {
        case "眼的回想":
            if (effect.isImmuneDeath && (!effect.value || effect.value > 0)) {
                lines.push('● 可以免疫一次致命伤害（整局限一次）');
            } else {
                lines.push('● 已使用免疫致命伤害效果');
            }
            lines.push('● 释放终结技时，可使自身和任意两名队友获得该隐印记');
            break;
        case "生命吸取":
            if (effect.value) lines.push(`● 造成伤害时回复${(effect.value * 100).toFixed(0)}%生命值`);
            break;
        case "魔力吸取":
            if (effect.value) lines.push(`● 造成伤害时回复${effect.value < 1 ? (effect.value * 100).toFixed(0) + '点' : '${effect.value}点'}战技点`);
            break;
        case "骑士之道的庇护":
            if (effect.attackBonus) lines.push(`● 回合结束时回复${(effect.attackBonus * 4).toFixed(0)}%最大生命值`);
            break;
        case "骑士之道的坚韧":
            if (effect.damageReduction) lines.push(`● 受到伤害减少${(effect.damageReduction * 100).toFixed(1)}%`);
            break;
        case "该隐印记":
            if (effect.value) {
                lines.push(`● 负面效果强度+20%`);
                lines.push(`● 层数: ${effect.value}`);
            }
            break;
        case "致命伤免疫":
            if (effect.immune) lines.push(`● 免疫致命伤害${effect.duration}次`);
            break;
        case "火翼的护盾":
            if (effect.value) lines.push(`● 护盾值: ${effect.value}`);
            break;
        case "决斗的激励": lines.push('● 速度提升'); break;
        case "决斗后的疲惫": lines.push('● 速度下降'); break;
        case "蹒跚独行的激励": lines.push('● 攻击力提升'); break;
        case "荣耀的统一": lines.push('● 攻击力和生命上限已统一'); break;
    }

    return lines.length ? lines.join('<br>') : '';
}