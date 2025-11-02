class BattleRenderer {
    createCharacterElement(character) {
        const characterElement = document.createElement('div');
        characterElement.className = `character ${character.type} ${character.isActive ? 'active' : ''}`;

        const hpPercent = (character.currentHp / character.maxHp) * 100;
        const PointPercent = (character.currentPoint / character.maxPoint) * 100;

        let statusEffectsHTML = '';
        if (character.statusEffects.length > 0) {
            statusEffectsHTML = '<div class="status-effects">';
            character.statusEffects.forEach(effect => {
                const effectClass = this.getStatusEffectClass(effect);
                const effectText = this.getStatusEffectText(effect);
                statusEffectsHTML += `<div class="status-effect ${effectClass}" title="${effectText}">${effect.name}(${effect.duration})</div>`;
            });
            statusEffectsHTML += '</div>';
        }

        let manaHTML = '';

        const canAct = character.canAct();
        const actionStatus = canAct ? '' : '<div class="action-status cannot-act">无法行动</div>';

characterElement.innerHTML = `
    <div class="character-icon" 
        style="
            ${character.image
                ? `background-image: url('${character.image}');
                   background-size: cover;
                   background-position: center;
                   background-repeat: no-repeat;`
                : ''}
        ">
        ${!character.image ? character.icon : ''}
    </div>
    <div class="character-name">${character.name}</div>
    ${actionStatus}
    <div class="hp-bar">
        <div class="hp-fill" style="width: ${hpPercent}%"></div>
    </div>
    <div class="Point-bar">
        <div class="Point-fill" style="width: ${PointPercent}%"></div>
    </div>
    ${manaHTML}
    <div class="character-stats">HP: ${character.currentHp}/${character.maxHp}</div>
    ${statusEffectsHTML}
`;

console.log("加载角色图片：", character.name, character.image);

        return characterElement;
    }

    getStatusEffectClass(effect) {
        if (effect.damageBonus > 0 || effect.basicAttackBonus > 0 || effect.skillBonus > 0 ||
            effect.ultimateBonus > 0 || effect.followUpBonus > 0) {
            return 'buff-effect';
        } else if (effect.damageTakenBonus > 0 || effect.isSilenced || effect.isStunned) {
            return 'debuff-effect';
        }
        return 'buff-effect';
    }

    // BattleRenderer.js - 完善状态效果显示
    getStatusEffectText(effect) {
        const parts = [];
        const lines = [];

        // 基础属性加成
        if (effect.attackBonus !== 0) {
            lines.push(`攻击力${effect.attackBonus > 0 ? '+' : ''}${Math.floor(effect.attackBonus)}`);
        }
        if (effect.defenseBonus !== 0) {
            lines.push(`防御力${effect.defenseBonus > 0 ? '+' : ''}${Math.floor(effect.defenseBonus)}`);
        }
        if (effect.speedBonus !== 0) {
            lines.push(`速度${effect.speedBonus > 0 ? '+' : ''}${Math.floor(effect.speedBonus)}`);
        }
        
        // 百分比属性加成
        if (effect.attackPercent !== 0) {
            lines.push(`攻击力${effect.attackPercent > 0 ? '+' : ''}${(effect.attackPercent * 100).toFixed(1)}%`);
        }
        if (effect.defensePercent !== 0) {
            lines.push(`防御力${effect.defensePercent > 0 ? '+' : ''}${(effect.defensePercent * 100).toFixed(1)}%`);
        }

        // 伤害加成（分类显示）
        if (effect.damageBonus !== 0) {
            lines.push(`全伤害${effect.damageBonus > 0 ? '+' : ''}${(effect.damageBonus * 100).toFixed(1)}%`);
        }
        if (effect.basicAttackBonus !== 0) {
            lines.push(`普通攻击伤害+${(effect.basicAttackBonus * 100).toFixed(1)}%`);
        }
        if (effect.skillBonus !== 0) {
            lines.push(`战技伤害+${(effect.skillBonus * 100).toFixed(1)}%`);
        }
        if (effect.ultimateBonus !== 0) {
            lines.push(`终结技伤害+${(effect.ultimateBonus * 100).toFixed(1)}%`);
        }
        if (effect.followUpBonus !== 0) {
            lines.push(`追击伤害+${(effect.followUpBonus * 100).toFixed(1)}%`);
        }
        
        // 属性伤害加成
        const damageTypeBonuses = [];
        if (effect.fireBonus !== 0) damageTypeBonuses.push(`火+${(effect.fireBonus * 100).toFixed(1)}%`);
        if (effect.iceBonus !== 0) damageTypeBonuses.push(`冰+${(effect.iceBonus * 100).toFixed(1)}%`);
        if (effect.lightningBonus !== 0) damageTypeBonuses.push(`雷+${(effect.lightningBonus * 100).toFixed(1)}%`);
        if (effect.windBonus !== 0) damageTypeBonuses.push(`风+${(effect.windBonus * 100).toFixed(1)}%`);
        if (effect.physicalBonus !== 0) damageTypeBonuses.push(`物理+${(effect.physicalBonus * 100).toFixed(1)}%`);
        if (effect.quantumBonus !== 0) damageTypeBonuses.push(`量子+${(effect.quantumBonus * 100).toFixed(1)}%`);
        if (effect.imaginaryBonus !== 0) damageTypeBonuses.push(`虚数+${(effect.imaginaryBonus * 100).toFixed(1)}%`);
        if (damageTypeBonuses.length > 0) {
            lines.push(`属性伤害: ${damageTypeBonuses.join(', ')}`);
        }

        // 易伤和防御相关
        if (effect.damageTakenBonus !== 0) {
            lines.push(`受到伤害${effect.damageTakenBonus > 0 ? '+' : ''}${(effect.damageTakenBonus * 100).toFixed(1)}%`);
        }
        if (effect.vulnerability !== 0) {
            lines.push(`易伤+${(effect.vulnerability * 100).toFixed(1)}%`);
        }
        if (effect.damageReduction !== 0) {
            lines.push(`伤害减免${(effect.damageReduction * 100).toFixed(1)}%`);
        }
        if (effect.defenseIgnore !== 0) {
            lines.push(`无视防御${(effect.defenseIgnore * 100).toFixed(1)}%`);
        }

        // 特殊状态
        if (effect.isSilenced) lines.push('● 无法使用技能');
        if (effect.isStunned) lines.push('● 无法行动');
        if (effect.isFrozen) lines.push('● 无法行动');
        if (effect.isImmuneDeath) lines.push('● 免疫致命伤害');
        if (effect.isBurned) lines.push('● 每回合受到持续伤害');
        if (effect.isShocked) lines.push('● 受到伤害增加');

        // 特殊效果描述（基于效果名称）
        if (effect.name === "眼的回想") {
            if (effect.isImmuneDeath && (effect.value === undefined || effect.value > 0)) {
                lines.push('● 可以免疫一次致命伤害（整局限一次）');
            } else {
                lines.push('● 已使用免疫致命伤害效果');
            }
            lines.push('● 释放终结技时，可使自身和任意两名队友获得该隐印记');
        }
        if (effect.name === "生命吸取" && effect.value) {
            lines.push(`● 造成伤害时回复${(effect.value * 100).toFixed(0)}%伤害量的生命值`);
        }
        if (effect.name === "魔力吸取" && effect.value) {
            if (typeof effect.value === 'number' && effect.value < 1) {
                lines.push(`● 造成伤害时有${(effect.value * 100).toFixed(0)}%概率回复战技点`);
            } else {
                lines.push(`● 造成伤害时回复${effect.value}点战技点`);
            }
        }
        if (effect.name === "骑士之道的庇护" && effect.attackBonus) {
            lines.push(`● 回合结束时回复${(effect.attackBonus * 4).toFixed(0)}%最大生命值`);
        }
        if (effect.name === "骑士之道的坚韧" && effect.damageReduction) {
            lines.push(`● 受到伤害减少${(effect.damageReduction * 100).toFixed(1)}%`);
        }
        if (effect.name === "该隐印记" && effect.value) {
            lines.push(`● 负面效果强度+20%`);
            lines.push(`● 层数: ${effect.value}`);
        }
        if (effect.name === "致命伤免疫" && effect.immune) {
            lines.push(`● 免疫致命伤害${effect.duration}次`);
        }
        if (effect.name === "火翼的护盾" && effect.value) {
            lines.push(`● 护盾值: ${effect.value}`);
        }
        if (effect.name === "决斗的激励") {
            lines.push(`● 速度提升`);
        }
        if (effect.name === "决斗后的疲惫") {
            lines.push(`● 速度下降`);
        }
        if (effect.name === "蹒跚独行的激励") {
            lines.push(`● 攻击力提升`);
        }
        if (effect.name === "荣耀的统一") {
            lines.push(`● 攻击力和生命上限已统一`);
        }

        // 如果没有任何效果描述，返回空字符串
        if (lines.length === 0) {
            return '';
        }

        // 将多行组合，用换行符分隔
        return lines.join('<br>');
    }

    // 生成角色详细信息的tooltip内容
    createCharacterTooltip(character) {
        // 计算实际属性值
        const actualAttack = character.getActualAttack ? character.getActualAttack() : character.baseAttack;
        const actualDefense = character.getActualDefense ? character.getActualDefense() : character.baseDefense;
        const actualSpeed = character.getActualSpeed ? character.getActualSpeed() : character.speed;

        let html = `
            <div class="tooltip-header">
                <div class="tooltip-icon">${character.icon}</div>
                <div class="tooltip-name">${character.name}</div>
                ${character.tag ? `<div class="tooltip-tag">标签: ${character.tag}</div>` : ''}
            </div>
            <div class="tooltip-section">
                <div class="tooltip-section-title">基础属性</div>
                <div class="tooltip-stats">
                    <div class="tooltip-stat">
                        <span class="stat-label">生命值:</span>
                        <span class="stat-value">${character.currentHp} / ${character.maxHp}</span>
                    </div>
                    <div class="tooltip-stat">
                        <span class="stat-label">攻击力:</span>
                        <span class="stat-value">${Math.floor(actualAttack)}</span>
                        ${actualAttack !== character.baseAttack ? `<span class="stat-diff">(${actualAttack > character.baseAttack ? '+' : ''}${Math.floor(actualAttack - character.baseAttack)})</span>` : ''}
                    </div>
                    <div class="tooltip-stat">
                        <span class="stat-label">防御力:</span>
                        <span class="stat-value">${Math.floor(actualDefense)}</span>
                        ${actualDefense !== character.baseDefense ? `<span class="stat-diff">(${actualDefense > character.baseDefense ? '+' : ''}${Math.floor(actualDefense - character.baseDefense)})</span>` : ''}
                    </div>
                    <div class="tooltip-stat">
                        <span class="stat-label">速度:</span>
                        <span class="stat-value">${Math.floor(actualSpeed)}</span>
                        ${actualSpeed !== character.speed ? `<span class="stat-diff">(${actualSpeed > character.speed ? '+' : ''}${Math.floor(actualSpeed - character.speed)})</span>` : ''}
                    </div>
                    <div class="tooltip-stat">
                        <span class="stat-label">暴击率:</span>
                        <span class="stat-value">${(character.critRate * 100).toFixed(1)}%</span>
                    </div>
                    <div class="tooltip-stat">
                        <span class="stat-label">暴击伤害:</span>
                        <span class="stat-value">${(character.critDamage * 100).toFixed(0)}%</span>
                    </div>
                    <div class="tooltip-stat">
                        <span class="stat-label">战技点:</span>
                        <span class="stat-value">${character.currentPoint} / ${character.maxPoint}</span>
                    </div>
                </div>
            </div>
        `;

        // 状态效果详情
        if (character.statusEffects && character.statusEffects.length > 0) {
            html += `
                <div class="tooltip-section">
                    <div class="tooltip-section-title">状态效果 (${character.statusEffects.length})</div>
                    <div class="tooltip-effects">
            `;
            
            character.statusEffects.forEach(effect => {
                const effectClass = this.getStatusEffectClass(effect);
                const effectDetails = this.getStatusEffectText(effect);
                html += `
                    <div class="tooltip-effect ${effectClass}">
                        <div class="effect-header">
                            <span class="effect-name">${effect.name}</span>
                            <span class="effect-duration">${effect.duration}回合</span>
                        </div>
                        ${effectDetails ? `<div class="effect-details">${effectDetails}</div>` : '<div class="effect-details">无特殊效果</div>'}
                        ${effect.value !== undefined && effect.value !== null && !effect.name.match(/印记/) ? `<div class="effect-value">值: ${typeof effect.value === 'number' ? (effect.value * 100).toFixed(0) + '%' : effect.value}</div>` : ''}
                        ${effect.attackBonus !== undefined && effect.attackBonus !== null && effect.name === "骑士之道的庇护" ? `<div class="effect-value">骑士数量: ${effect.attackBonus}</div>` : ''}
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }

        return html;
    }
}

window.BattleRenderer = BattleRenderer;