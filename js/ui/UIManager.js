class UIManager {
    constructor(gameState, battleSystem) {
        this.gameState = gameState;
        this.battleSystem = battleSystem;
        this.battleRenderer = new BattleRenderer();
        this.skillPanel = new SkillPanel();
        this.isProcessing = false;
        this.selectedSkill = null; // 当前选择的技能

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const resetBtn = document.getElementById('reset-game');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
            this.gameState.resetGame();
            this.updateUI();
        });
        } else {
            console.warn('reset-game按钮未找到，可能选人界面尚未切换');
        }

        // 移除目标选择面板的相关代码
    }

    updateUI() {
        this.updateSpeedTrack();
        this.updateCharacterDisplay();
        this.updateCurrentTurn();
        this.updateSkillPanel();
        this.updateBattleLog();

        if (this.gameState.isGameOver) {
            this.showGameOver();
        } else {
            if (!this.gameState.isPlayerTurn && !this.isProcessing) {
                this.executeEnemyTurn();
            }
        }
    }

    // 更新统一的速度条显示
    updateSpeedTrack() {
        const speedTrack = document.getElementById('speed-track');
        const speedTrackMarkers = document.getElementById('speed-track-markers');
        
        if (!speedTrack) {
            console.warn('速度条元素 speed-track 未找到');
            return;
        }
        
        if (!speedTrackMarkers) {
            console.warn('速度条标记容器 speed-track-markers 未找到');
            return;
        }

        // 获取所有存活角色
        const aliveCharacters = this.gameState.getAliveCharacters();
        
        if (aliveCharacters.length === 0) {
            speedTrackMarkers.innerHTML = '';
            console.log('没有存活的角色，速度条为空');
            return;
        }
        
        // 速度条长度为500，显示角色在0-500范围内的位置（使用模运算）
        const TRACK_LENGTH = 500;

        // 使用Map来跟踪现有标记，避免重新创建元素
        const existingMarkers = new Map();
        Array.from(speedTrackMarkers.children).forEach(marker => {
            const uuid = marker.getAttribute('data-uuid');
            if (uuid) {
                existingMarkers.set(uuid, marker);
            }
        });

        aliveCharacters.forEach(character => {
            // 确保 actionValue 存在
            if (typeof character.actionValue === 'undefined') {
                character.actionValue = 0;
            }
            
            // 计算角色在当前500段内的位置（0-100%）
            const currentSegmentValue = character.actionValue % TRACK_LENGTH;
            const position = Math.min(100, (currentSegmentValue / TRACK_LENGTH) * 100);
            
            // 计算已经完成的圈数
            const completedLaps = Math.floor(character.actionValue / TRACK_LENGTH);
            
            // 检查是否可以行动
            const canTakeAction = character.canTakeAction && character.canTakeAction();
            
            // 尝试获取现有标记，如果不存在则创建新的
            let marker = existingMarkers.get(character.uuid);
            
            if (!marker) {
                // 创建新标记
                marker = document.createElement('div');
                marker.className = `speed-track-marker ${character.type}`;
                marker.setAttribute('data-character', character.name);
                marker.setAttribute('data-uuid', character.uuid);

                // 创建角色图标
                const icon = document.createElement('div');
                icon.className = 'speed-marker-icon';
                icon.textContent = character.icon || '🚀';

                // 创建角色名称标签
                const label = document.createElement('div');
                label.className = 'speed-marker-label';
                label.textContent = character.name || '未知';

                marker.appendChild(icon);
                marker.appendChild(label);
                speedTrackMarkers.appendChild(marker);
                
                // 初始位置设置（无动画）
                marker.style.transition = 'none';
                marker.style.left = `${position}%`;
                // 强制重排以应用初始位置
                marker.offsetHeight;
                // 恢复动画
                marker.style.transition = '';
            } else {
                // 更新现有标记
                existingMarkers.delete(character.uuid);
            }
            
            // 更新标记的样式和类
            const classes = [`speed-track-marker`, character.type];
            if (character.isActive) classes.push('active');
            if (canTakeAction) classes.push('ready');
            marker.className = classes.join(' ');
            
            // 使用requestAnimationFrame确保平滑更新
            requestAnimationFrame(() => {
                marker.style.left = `${position}%`;
            });
            
            const actualSpeed = character.getActualSpeed ? character.getActualSpeed() : (character.speed || 0);
            marker.title = `${character.name}\n行动值: ${Math.floor(character.actionValue)}\n当前段: ${Math.floor(currentSegmentValue)}/500\n已完成圈数: ${completedLaps}\n速度: ${actualSpeed}`;
        });
        
        // 移除不再存在的标记（角色已死亡或离开）
        existingMarkers.forEach(marker => {
            marker.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            marker.style.opacity = '0';
            marker.style.transform = 'translateX(-50%) scale(0.8)';
            setTimeout(() => {
                if (marker.parentNode) {
                    marker.parentNode.removeChild(marker);
                }
            }, 300);
        });
    }

    executeEnemyTurn() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        const currentEnemy = this.gameState.characters[this.gameState.currentTurnIndex];

        console.log(`执行 ${currentEnemy.name} 的回合`);

        setTimeout(() => {
            try {
                const allSurvived = this.battleSystem.executeEnemyTurn(currentEnemy);
                this.gameState.checkGameEnd();
                this.updateUI();

                if (!allSurvived) {
                    setTimeout(() => {
                        this.continueToNextTurn();
                    }, 1500);
                } else {
                    this.continueToNextTurn();
                }
            } catch (error) {
                console.error('执行敌人回合时出错:', error);
                this.continueToNextTurn();
            }
        }, 1000);
    }

    continueToNextTurn() {
        const isPlayerTurn = this.gameState.nextTurn();
        this.isProcessing = false;

        if (!this.gameState.isGameOver) {
            this.updateUI();

            if (!isPlayerTurn) {
                setTimeout(() => {
                    this.executeEnemyTurn();
                }, 500);
            }
        }
    }

    updateCharacterDisplay() {
        const alliesContainer = document.getElementById('allies-container');
        const enemiesContainer = document.getElementById('enemies-container');

        // 清理所有现有的tooltip
        this.cleanupAllTooltips();

        alliesContainer.innerHTML = '';
        enemiesContainer.innerHTML = '';

        // 绘制我方角色
        this.gameState.getAllies().forEach(character => {
            const characterElement = this.battleRenderer.createCharacterElement(character);

            // 为角色添加点击事件
            characterElement.addEventListener('click', () => {
                this.handleCharacterClick(character);
            });

            // 添加鼠标悬停事件显示tooltip
            this.setupTooltip(characterElement, character);

            // 如果当前有选中的技能，高亮可用的目标
            if (this.selectedSkill) {
                if (this.isValidTarget(character, this.selectedSkill)) {
                    characterElement.classList.add('selectable-target');
                }
            }

            alliesContainer.appendChild(characterElement);
        });

        // 绘制敌方角色
        this.gameState.getEnemies().forEach(character => {
            const characterElement = this.battleRenderer.createCharacterElement(character);

            // 为角色添加点击事件
            characterElement.addEventListener('click', () => {
                this.handleCharacterClick(character);
            });

            // 添加鼠标悬停事件显示tooltip
            this.setupTooltip(characterElement, character);

            // 如果当前有选中的技能，高亮可用的目标
            if (this.selectedSkill) {
                if (this.isValidTarget(character, this.selectedSkill)) {
                    characterElement.classList.add('selectable-target');
                }
            }

            enemiesContainer.appendChild(characterElement);
        });
    }

    handleSkillClick(skill, user) {
        if (!this.battleSystem.isSkillAvailable(skill, user) || this.isProcessing) {
            return;
        }

        console.log(`点击技能: ${skill.name}, 目标类型: ${skill.targetType}`);

        // 根据技能类型决定是否需要选择目标
        if (skill.requiresTargetSelection()) {
            console.log(`技能需要选择目标，显示可点击目标`);
            this.selectedSkill = skill;
            this.updateUI(); // 更新UI以显示可点击的目标
        } else {
            // 不需要选择目标的技能直接执行
            console.log(`技能不需要选择目标，直接执行`);
            this.executeSkill(skill, user);
        }
    }

    updateCurrentTurn() {
        const currentTurnElement = document.getElementById('current-turn');
        const turnIndicator = document.getElementById('turn-indicator');
        const currentCharacter = this.gameState.characters[this.gameState.currentTurnIndex];

        currentTurnElement.textContent = `当前行动: ${currentCharacter.name}`;

        if (this.gameState.isPlayerTurn) {
            turnIndicator.textContent = '👤 玩家回合';
            turnIndicator.className = 'turn-indicator player-turn';
        } else {
            turnIndicator.textContent = '👹 敌人回合';
            turnIndicator.className = 'turn-indicator enemy-turn';
        }
    }

    updateSkillPanel() {
        const skillsContainer = document.getElementById('skills-container');
        if (!skillsContainer) return;

        const currentCharacter = this.gameState.characters[this.gameState.currentTurnIndex];
        if (!currentCharacter) return;

        // 防御性检查：确保 skills 是数组
        const skills = Array.isArray(currentCharacter.skills) ? currentCharacter.skills : [];

        skillsContainer.innerHTML = '';

        skills.forEach(skill => {
            const skillElement = this.skillPanel.createSkillElement(skill, currentCharacter, this.battleSystem);

            skillElement.addEventListener('click', () => {
                this.handleSkillClick(skill, currentCharacter);
            });

            const targetDesc = document.createElement('div');
            targetDesc.className = 'skill-target-desc';
            targetDesc.textContent = skill.getTargetDescription ? skill.getTargetDescription() : '选择目标';
            targetDesc.style.fontSize = '0.6rem';
            targetDesc.style.color = '#b0b0ff';
            targetDesc.style.marginTop = '3px';
            skillElement.appendChild(targetDesc);

            skillsContainer.appendChild(skillElement);
        });
    }

    handleSkillClick(skill, user) {
        if (!this.battleSystem.isSkillAvailable(skill, user) || this.isProcessing) {
            return;
        }

        // 如果技能需要选择目标
        if (skill.requiresTargetSelection()) {
            console.log(`选择技能: ${skill.name}, 请点击目标`);
            this.selectedSkill = skill;
            this.updateUI(); // 更新UI以显示可点击的目标
        } else {
            // 不需要选择目标的技能直接执行
            this.executeSkill(skill, user);
        }
    }

    executeSkill(skill, user) {
        this.isProcessing = true;
        this.selectedSkill = null; // 清除选中的技能

        console.log(`直接执行技能: ${skill.name}`);
        const allSurvived = this.battleSystem.executeSkill(skill, user);

        this.gameState.checkGameEnd();
        this.updateUI();

        // 正常情况：切换到下一个回合
        if (!allSurvived) {
            setTimeout(() => {
                this.continueToNextTurn();
            }, 1500);
        } else {
            this.continueToNextTurn();
        }
    }

    handleCharacterClick(character) {
        console.log('角色被点击:', character.name);

        // 如果当前没有选中的技能，或者正在处理中，忽略点击
        if (!this.selectedSkill || this.isProcessing) {
            console.log('没有选中的技能或正在处理中，忽略点击');
            return;
        }

        // 检查目标是否有效
        if (!this.isValidTarget(character, this.selectedSkill)) {
            console.log('无效的目标:', character.name);
            return;
        }

        console.log('执行技能:', this.selectedSkill.name, '目标:', character.name);
        // 执行技能
        this.executeSkillWithTarget(this.selectedSkill, character);
    }

    // 修改：执行技能（需要选择目标）
    executeSkillWithTarget(skill, target) {
        this.isProcessing = true;
        const user = this.gameState.characters[this.gameState.currentTurnIndex];

        console.log(`执行带目标的技能: ${skill.name}, 目标: ${target.name}`);
        const allSurvived = this.battleSystem.executeSkill(skill, user, target);

        this.selectedSkill = null; // 清除选中的技能
        this.gameState.checkGameEnd();
        
        this.updateUI();

        // 正常情况：切换到下一个回合
        if (!allSurvived) {
            setTimeout(() => {
                this.continueToNextTurn();
            }, 1500);
        } else {
            this.continueToNextTurn();
        }
    }

    // 修改：检查目标是否有效
    isValidTarget(character, skill) {
        const user = this.gameState.characters[this.gameState.currentTurnIndex];

        // 检查目标是否存活
        if (character.currentHp <= 0) {
            console.log('目标已死亡，无效');
            return false;
        }

        // 根据技能目标类型检查有效性
        switch (skill.targetType) {
            case TargetType.SINGLE:
            case TargetType.SPREAD:
                if (skill.hasTag(SkillTag.ATTACK)) {
                    // 攻击技能只能选择敌人
                    const isValid = character.type === 'enemy';
                    console.log(`攻击技能目标检查: ${character.name} 是敌人? ${isValid}`);
                    return isValid;
                } else if (skill.hasTag(SkillTag.HEAL) || skill.hasTag(SkillTag.BUFF)) {
                    // 治疗和增益技能只能选择友方
                    const isValid = character.type === 'ally';
                    console.log(`治疗/增益技能目标检查: ${character.name} 是友方? ${isValid}`);
                    return isValid;
                }
                // 其他类型的技能默认允许选择
                console.log(`其他技能目标检查: ${character.name} 默认允许`);
                return true;

            default:
                console.log(`技能 ${skill.name} 不需要选择目标`);
                return false;
        }
    }

    executePlayerSkillWithTarget(skill, user, target) {
        this.isProcessing = true;

        const allSurvived = this.battleSystem.executeSkill(skill, user, target);

        this.gameState.selectedSkill = null;
        this.hideTargetSelection();
        this.gameState.checkGameEnd();
        this.updateUI();

        if (!allSurvived) {
            setTimeout(() => {
                this.continueToNextTurn();
            }, 1500);
        } else {
            this.continueToNextTurn();
        }
    }

    updateBattleLog() {
        const logEntries = document.getElementById('log-entries');
        logEntries.innerHTML = '';

        this.gameState.log.forEach(logEntry => {
            const logElement = document.createElement('div');
            logElement.className = 'log-entry';
            logElement.innerHTML = logEntry.message;
            logElement.style.color = logEntry.color;
            logEntries.appendChild(logElement);
        });

        logEntries.scrollTop = logEntries.scrollHeight;
    }

    showGameOver() {
        console.log('游戏结束');
    }

    // 清理所有tooltip
    cleanupAllTooltips() {
        // 移除所有tooltip元素
        const tooltips = document.querySelectorAll('.character-tooltip');
        tooltips.forEach(tooltip => {
            if (tooltip.parentNode) {
                tooltip.remove();
            }
        });

        // 清理所有元素上的tooltip清理函数
        const allCharacters = document.querySelectorAll('.character');
        allCharacters.forEach(element => {
            if (element._tooltipCleanup) {
                element._tooltipCleanup();
                delete element._tooltipCleanup;
            }
            if (element._tooltipGlobalCleanup) {
                element._tooltipGlobalCleanup();
                delete element._tooltipGlobalCleanup;
            }
        });
    }

    // 设置tooltip功能
    setupTooltip(element, character) {
        let tooltip = null;
        let showTimeout = null;
        let hideTimeout = null;
        let moveHandler = null;
        let tooltipEnterHandler = null;
        let tooltipLeaveHandler = null;

        // 清理函数
        const cleanup = () => {
            if (showTimeout) {
                clearTimeout(showTimeout);
                showTimeout = null;
            }
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }
            if (tooltip) {
                if (moveHandler && element) {
                    element.removeEventListener('mousemove', moveHandler);
                }
                if (tooltipEnterHandler) {
                    tooltip.removeEventListener('mouseenter', tooltipEnterHandler);
                }
                if (tooltipLeaveHandler) {
                    tooltip.removeEventListener('mouseleave', tooltipLeaveHandler);
                }
                if (tooltip.parentNode) {
                    tooltip.remove();
                }
                tooltip = null;
                moveHandler = null;
                tooltipEnterHandler = null;
                tooltipLeaveHandler = null;
            }
        };

        // 隐藏tooltip函数
        const hideTooltip = () => {
            if (tooltip) {
                if (moveHandler && element) {
                    element.removeEventListener('mousemove', moveHandler);
                    moveHandler = null;
                }
                if (tooltipEnterHandler) {
                    tooltip.removeEventListener('mouseenter', tooltipEnterHandler);
                    tooltipEnterHandler = null;
                }
                if (tooltipLeaveHandler) {
                    tooltip.removeEventListener('mouseleave', tooltipLeaveHandler);
                    tooltipLeaveHandler = null;
                }
                if (tooltip.parentNode) {
                    tooltip.remove();
                }
                tooltip = null;
            }
        };

        element.addEventListener('mouseenter', () => {
            // 清除隐藏定时器
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }

            // 如果tooltip已经存在，不重复创建
            if (tooltip && tooltip.parentNode) {
                return;
            }

            // 延迟显示tooltip，避免鼠标快速划过时闪烁
            showTimeout = setTimeout(() => {
                // 再次检查是否还需要显示（可能在延迟期间已经移开）
                if (!element || !document.body.contains(element)) {
                    return;
                }

                // 创建tooltip元素
                tooltip = document.createElement('div');
                tooltip.className = 'character-tooltip';
                tooltip.innerHTML = this.battleRenderer.createCharacterTooltip(character);
                document.body.appendChild(tooltip);

                // 计算tooltip位置
                const updatePosition = () => {
                    if (!tooltip || !element || !document.body.contains(element)) {
                        return;
                    }
                    const rect = element.getBoundingClientRect();
                    const tooltipRect = tooltip.getBoundingClientRect();
                    const margin = 10;

                    let left = rect.right + margin;
                    let top = rect.top;

                    // 如果右侧空间不足，显示在左侧
                    if (left + tooltipRect.width > window.innerWidth) {
                        left = rect.left - tooltipRect.width - margin;
                    }

                    // 如果下方空间不足，向上移动
                    if (top + tooltipRect.height > window.innerHeight) {
                        top = window.innerHeight - tooltipRect.height - margin;
                    }

                    // 确保不超出左边界和上边界
                    if (left < 0) left = margin;
                    if (top < 0) top = margin;

                    tooltip.style.left = left + 'px';
                    tooltip.style.top = top + 'px';
                };

                updatePosition();
                
                // 鼠标移动时更新位置
                moveHandler = () => updatePosition();
                element.addEventListener('mousemove', moveHandler);

                // 为tooltip添加鼠标事件（只添加一次）
                tooltipEnterHandler = () => {
                    if (hideTimeout) {
                        clearTimeout(hideTimeout);
                        hideTimeout = null;
                    }
                };

                tooltipLeaveHandler = () => {
                    hideTooltip();
                };

                tooltip.addEventListener('mouseenter', tooltipEnterHandler);
                tooltip.addEventListener('mouseleave', tooltipLeaveHandler);

                showTimeout = null;
            }, 300);
        });

        element.addEventListener('mouseleave', () => {
            // 清除显示定时器
            if (showTimeout) {
                clearTimeout(showTimeout);
                showTimeout = null;
            }

            // 延迟隐藏tooltip，给用户时间移动到tooltip上
            if (tooltip && tooltip.parentNode) {
                hideTimeout = setTimeout(() => {
                    hideTooltip();
                }, 200);
            }
        });

        // 全局事件处理器
        const globalMouseLeaveHandler = () => {
            cleanup();
        };

        const globalClickHandler = (e) => {
            // 如果点击的不是元素或tooltip，隐藏tooltip
            if (tooltip && !element.contains(e.target) && !tooltip.contains(e.target)) {
                cleanup();
            }
        };

        const globalScrollHandler = (e) => {
            // 只在tooltip外部滚动时隐藏tooltip
            if (tooltip && e.target) {
                // 检查滚动是否发生在tooltip内部
                let scrollTarget = e.target;
                let isInsideTooltip = false;
                
                // 向上遍历DOM树，检查是否在tooltip内
                while (scrollTarget && scrollTarget !== document.body) {
                    if (scrollTarget === tooltip || (tooltip.contains && tooltip.contains(scrollTarget))) {
                        isInsideTooltip = true;
                        break;
                    }
                    scrollTarget = scrollTarget.parentElement;
                }
                
                // 只有当滚动发生在tooltip外部时才关闭
                if (!isInsideTooltip) {
                    cleanup();
                }
            } else if (tooltip) {
                // 如果无法确定滚动目标，检查是否鼠标在tooltip内
                const tooltipRect = tooltip.getBoundingClientRect();
                const mouseX = e.clientX || 0;
                const mouseY = e.clientY || 0;
                const isMouseInTooltip = (
                    mouseX >= tooltipRect.left &&
                    mouseX <= tooltipRect.right &&
                    mouseY >= tooltipRect.top &&
                    mouseY <= tooltipRect.bottom
                );
                
                // 如果鼠标不在tooltip内，则关闭
                if (!isMouseInTooltip) {
                    cleanup();
                }
            }
        };

        const globalResizeHandler = () => {
            if (tooltip) {
                cleanup();
            }
        };

        window.addEventListener('blur', globalMouseLeaveHandler);
        document.addEventListener('mouseleave', globalMouseLeaveHandler);
        document.addEventListener('click', globalClickHandler, true);
        // 使用wheel事件替代scroll事件，更准确地捕获滚动意图
        window.addEventListener('wheel', globalScrollHandler, { passive: true });
        window.addEventListener('resize', globalResizeHandler);

        // 在元素上存储清理函数，以便在元素被移除时调用
        element._tooltipCleanup = cleanup;
        element._tooltipGlobalCleanup = () => {
            window.removeEventListener('blur', globalMouseLeaveHandler);
            document.removeEventListener('mouseleave', globalMouseLeaveHandler);
            document.removeEventListener('click', globalClickHandler, true);
            window.removeEventListener('wheel', globalScrollHandler);
            window.removeEventListener('resize', globalResizeHandler);
        };
    }
}

window.UIManager = UIManager;