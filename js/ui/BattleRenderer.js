class BattleRenderer {
    createCharacterElement(character) {
        const characterElement = document.createElement('div');
        characterElement.className = `character ${character.type} ${character.isActive ? 'active' : ''}`;

        const hpPercent = (character.currentHp / character.maxHp) * 100;
        const PointPercent = (character.currentPoint / character.maxPoint) * 100;

        let statusEffectsHTML = '';
        if (character.statusEffects.length > 0) {
            statusEffectsHTML = '<div class="status-effects">';

            const effectsToShow = character.statusEffects.slice(0, 3); // 只显示前三个
            effectsToShow.forEach(effect => {
                const effectClass = this.getStatusEffectClass(effect);
                const effectText = this.getStatusEffectText(effect);
                statusEffectsHTML += `<div class="status-effect ${effectClass}" title="${effectText}">${effect.name}(${effect.duration})</div>`;
            });

            // 如果超过3个buff，显示省略号
            if (character.statusEffects.length > 3) {
                statusEffectsHTML += `<div class="status-effect more">...</div>`;
            }

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
        return window.getStatusEffectText(effect); // 调用外部文件
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