class GameState {
    constructor() {
        this.characters = [];
        this.currentTurnIndex = 0;
        this.turnCount = 1;
        this.log = [];
        this.isGameOver = false;
        this.selectedSkill = null;
        this.selectedTarget = null;
        this.isPlayerTurn = true;
        this.actionQueue = [];
        this.SPEED_TRACK_LENGTH = 500;

        // 初始化全局回合事件监听器
        this.initializeTurnEventListeners();
    }

    initializeTurnEventListeners() {
        // 监听全局回合开始事件
        window.eventSystem.on('global_turn_start', (event) => {
            const { character, turnCount, isPlayerTurn } = event.data;
            console.log(`🎯 全局回合开始: ${character.name} 第${turnCount}回合`);
        });

        // 监听回合结束事件
        window.eventSystem.on('turn_end', (event) => {
            const { source, turnCount } = event.data;
            console.log(`🏁 回合结束: ${source.name}`);
        });

        // 监听状态效果移除事件
        window.eventSystem.on('status_effect_removed', (event) => {
            const { source, effect } = event.data;
            console.log(`❌ 状态效果移除: ${source.name} - ${effect.name}`);
        });

        // 监听额外行动事件
        window.eventSystem.on('extra_action_gained', (event) => {
            const { source } = event.data;
            console.log(`⚡ 额外行动: ${source.name}`);
        });
    }

    addCharacter(character) {
        character.gameState = this;  // 这里设置 gameState 引用
        this.characters.push(character);
        
        // 如果角色有initializeEvents方法且gameState已设置，在这里初始化事件监听器
        // （因为initializeEvents需要gameState才能正常工作）
        if (character.passiveSkills && character.passiveSkills.initializeEvents && 
            character.gameState && typeof character.passiveSkills.initializeEvents === 'function') {
            // 检查是否已经初始化过（通过检查是否有事件监听器）
            // 如果之前已经在CharacterLoader中初始化过，这里会再次调用，但事件监听器可以重复注册
            // 为了避免重复初始化，我们可以检查是否已经注册过监听器
            // 或者简单地再次调用，因为事件系统允许重复监听器
            try {
                character.passiveSkills.initializeEvents.call(character.passiveSkills, character);
            } catch (error) {
                console.error(`初始化 ${character.name} 的事件监听器时出错:`, error);
            }
        }
    }

    getAllies() {
        return this.characters.filter(char => char.type === 'ally');
    }

    getEnemies() {
        return this.characters.filter(char => char.type === 'enemy');
    }

    getAliveCharacters() {
        return this.characters.filter(char => char.currentHp > 0);
    }

    // 初始化速度条系统
    initializeSpeedSystem() {
        // 初始化所有角色的行动值
        this.characters.forEach(char => {
            if (char.currentHp > 0) {
                char.actionValue = 0;
            }
        });

        // 构建初始行动队列（按速度排序）
        this.updateActionQueue();

        // 推进角色直到至少有一个角色可以行动
        let iterations = 0;
        const maxIterations = 1000;
        while (this.actionQueue.length > 0 && !this.getNextCharacter() && iterations < maxIterations) {
            this.advanceAllCharacters();
            iterations++;
        }
    }

    // 更新行动队列（按行动值排序，行动值高的在前）
    updateActionQueue() {
        const aliveCharacters = this.getAliveCharacters();

        // 按行动值降序排序，行动值相同则按速度降序
        this.actionQueue = aliveCharacters.slice().sort((a, b) => {
            if (b.actionValue !== a.actionValue) {
                return b.actionValue - a.actionValue;
            }
            return b.getActualSpeed() - a.getActualSpeed();
        });

        console.log('行动队列更新:', this.actionQueue.map(c => ({
            name: c.name,
            actionValue: c.actionValue,
            speed: c.getActualSpeed()
        })));
    }

    // 推进所有角色的行动值
    advanceAllCharacters() {
        this.characters.forEach(char => {
            if (char.currentHp > 0) {
                char.advanceActionValue();
            }
        });

        // 更新行动队列
        this.updateActionQueue();
    }

    // 获取下一个应该行动的角色
    getNextCharacter() {
        // 找到第一个行动值达到500的倍数的角色
        for (let char of this.actionQueue) {
            if (char.canTakeAction()) {
                return char;
            }
        }
        return null;
    }

    // 插入角色到行动队列（用于额外行动等效果）
    insertIntoActionQueue(character, actionValue = null) {
        if (actionValue === null) {
            // 如果不指定行动值，设置为当前最高行动值
            if (this.actionQueue.length > 0) {
                actionValue = this.actionQueue[0].actionValue;
            } else {
                actionValue = this.SPEED_TRACK_LENGTH;
            }
        }

        character.actionValue = actionValue;
        this.updateActionQueue();
    }

    nextTurn() {
        if (this.isGameOver) return false;

        // 获取当前行动角色（如果有）
        let currentCharacter = null;
        const currentIndex = this.characters.findIndex(c => c.isActive);
        if (currentIndex >= 0) {
            currentCharacter = this.characters[currentIndex];
        }

        // 如果有当前行动角色，处理回合结束
        if (currentCharacter) {
            console.log(`=== ${currentCharacter.name} 的回合结束 ===`);

            // 触发回合结束事件
            currentCharacter.trigger('turn_end', {
                turnCount: this.turnCount,
                actionValue: currentCharacter.actionValue
            });

            // 处理回合开始前效果（通过事件系统）
            this.handleTurnStartEffects(currentCharacter);

            // 处理回合结束后效果（通过事件系统）
            this.handleTurnEndEffects(currentCharacter);

            // 消耗行动值（减去500）
            currentCharacter.consumeAction();

            // 触发行动消耗事件
            currentCharacter.trigger('action_consumed', {
                actionValueCost: 500,
                remainingActionValue: currentCharacter.actionValue
            });

            // 检查是否有额外行动
            if (currentCharacter.hasExtraAction) {
                // 清除额外行动标志
                currentCharacter.hasExtraAction = false;
                // 设置行动值为500，确保可以立即行动
                currentCharacter.actionValue = 500;
                // 保持角色活跃状态
                currentCharacter.isActive = true;

                // 触发额外行动事件
                currentCharacter.trigger('extra_action_gained', {
                    actionValue: 500
                });

                console.log(`=== ${currentCharacter.name} 获得额外行动，继续行动 ===`);
                return currentCharacter.type === 'ally';
            }

            // 标记角色非活跃
            currentCharacter.isActive = false;

            // 触发角色非活跃事件
            currentCharacter.trigger('character_inactive');
        }

        // 推进所有角色的行动值
        this.advanceAllCharacters();

        // 触发全局行动推进事件
        window.eventSystem.trigger('all_characters_advanced', {
            turnCount: this.turnCount
        });

        // 获取下一个应该行动的角色
        let nextCharacter = this.getNextCharacter();

        // 如果没有角色达到行动值，继续推进直到有人达到
        let iterations = 0;
        const maxIterations = 1000; // 防止无限循环
        while (!nextCharacter && iterations < maxIterations) {
            this.advanceAllCharacters();
            nextCharacter = this.getNextCharacter();
            iterations++;

            // 触发推进迭代事件
            window.eventSystem.trigger('advance_iteration', {
                iteration: iterations,
                maxIterations: maxIterations
            });
        }

        if (!nextCharacter) {
            console.error('无法找到下一个行动角色');
            // 触发无法找到行动角色事件
            window.eventSystem.trigger('no_next_character_found', {
                turnCount: this.turnCount,
                characters: this.getAliveCharacters().map(c => ({
                    name: c.name,
                    actionValue: c.actionValue,
                    speed: c.getActualSpeed()
                }))
            });
            return false;
        }

        // 找到下一个角色的索引
        const nextIndex = this.characters.findIndex(c => c === nextCharacter);
        if (nextIndex < 0) {
            console.error('无法找到角色索引');
            return false;
        }

        this.currentTurnIndex = nextIndex;
        this.turnCount++;
        this.isPlayerTurn = nextCharacter.type === 'ally';

        // 重置选择
        this.selectedSkill = null;
        this.selectedTarget = null;

        console.log(`=== ${nextCharacter.name} 的回合开始 (行动值: ${nextCharacter.actionValue.toFixed(1)}, 速度: ${nextCharacter.getActualSpeed()}) ===`);

        // 触发回合开始事件
        nextCharacter.trigger('turn_start', {
            turnCount: this.turnCount,
            actionValue: nextCharacter.actionValue,
            isPlayerTurn: this.isPlayerTurn
        });

        // 触发全局回合开始事件
        window.eventSystem.trigger('global_turn_start', {
            character: nextCharacter,
            turnCount: this.turnCount,
            isPlayerTurn: this.isPlayerTurn
        });

        // 处理新回合开始
        this.handleNewTurnStart(nextCharacter);

        return this.isPlayerTurn;
    }

    handleTurnStartEffects(character) {
        // 触发回合开始效果处理事件
        character.trigger('before_turn_start_effects', {
            statusEffects: character.statusEffects.filter(effect => effect.triggerTime === 'start')
        });

        // 只处理 triggerTime === 'start' 的效果
        this.processStatusEffects(character, 'start');

        // 触发回合开始效果处理完成事件
        character.trigger('after_turn_start_effects', {
            statusEffects: character.statusEffects
        });
    }

    handleTurnEndEffects(character) {
        // 触发回合结束效果处理事件
        character.trigger('before_turn_end_effects', {
            statusEffects: character.statusEffects.filter(effect => effect.triggerTime === 'end')
        });

        // 只处理 triggerTime === 'end' 的效果  
        this.processStatusEffects(character, 'end');

        // 触发回合结束效果处理完成事件
        character.trigger('after_turn_end_effects', {
            statusEffects: character.statusEffects
        });
    }

    // 统一的状态效果处理方法（事件化版本）
    processStatusEffects(character, triggerTime) {
        const effectsToRemove = [];
        const effectsToTrigger = []; // 需要触发的特殊效果

        // 触发状态效果处理开始事件
        character.trigger('status_effects_processing_start', {
            triggerTime: triggerTime,
            statusEffects: character.statusEffects
        });

        character.statusEffects.forEach(effect => {
            if (effect.triggerTime === triggerTime) {
                console.log(`处理 ${character.name} 的 ${effect.name} (${triggerTime})`);

                // 触发单个状态效果处理事件
                character.trigger('status_effect_processing', {
                    effect: effect,
                    triggerTime: triggerTime
                });

                // 检查是否需要减少持续时间
                if (effect.shouldDecrease(character, this.currentTurnIndex, this)) {
                    const oldDuration = effect.duration;
                    effect.duration -= 1;
                    console.log(`  ${effect.name} 持续时间: ${oldDuration} -> ${effect.duration}`);

                    // 触发状态效果持续时间减少事件
                    character.trigger('status_effect_duration_decreased', {
                        effect: effect,
                        oldDuration: oldDuration,
                        newDuration: effect.duration
                    });
                }

                // 检查是否需要移除
                if (effect.duration <= 0) {
                    effectsToRemove.push(effect);
                    console.log(`  ${effect.name} 效果结束`);

                    // 触发状态效果即将移除事件
                    character.trigger('status_effect_expiring', {
                        effect: effect
                    });
                    
                    // 如果是"下回合给予该隐印记"，标记需要触发
                    if (effect.name === "下回合给予该隐印记") {
                        effectsToTrigger.push(effect);
                    }
                }
            }
        });

        // 移除过期效果
        character.statusEffects = character.statusEffects.filter(effect =>
            !effectsToRemove.includes(effect)
        );

        // 通知效果移除并触发特殊效果
        effectsToRemove.forEach(effect => {
            this.addLog(`${character.name}的【${effect.name}】效果结束了`, 'debuff');

            // 触发状态效果移除事件
            character.trigger('status_effect_removed', {
                effect: effect
            });
            
            // 如果移除的是"该隐印记"，同时移除相关的攻击加成
            if (effect.name === "该隐印记") {
                character.statusEffects = character.statusEffects.filter(e => 
                    e.name !== "该隐印记-攻击"
                );
            }
        });
        
        // 处理需要触发的特殊效果（在移除后触发）
        effectsToTrigger.forEach(effect => {
            if (effect.name === "下回合给予该隐印记") {
                const count = effect.value || 2;
                this.grantCainMark(character, count);
            }
        });

        // 处理持续治疗效果（回合结束时）
        if (triggerTime === 'end') {
            character.statusEffects.forEach(effect => {
                // 骑士之道治疗效果
                if (effect.name === "骑士之道的庇护" && effect.attackBonus) {
                    const knightCount = effect.attackBonus; // 使用attackBonus存储骑士数量
                    const healAmount = Math.floor(character.maxHp * 0.04 * knightCount);
                    const oldHp = character.currentHp;
                    character.currentHp = Math.min(character.maxHp, character.currentHp + healAmount);
                    if (character.currentHp > oldHp) {
                        this.addLog(`${character.name} 受到骑士之道治疗 ${healAmount} 点生命`, 'heal');
                         // 触发持续治疗事件
                         character.trigger('hot_healing', {
                            effect: effect,
                            healAmount: healAmount,
                            oldHp: oldHp,
                            newHp: character.currentHp,
                            knightCount: knightCount
                        });
                    }
                }
                
                // 该隐印记：持续时间在processStatusEffects中通过duration自动减少
                // 当duration变为0时，会在effectsToRemove中移除
                // 这里只需要在移除时输出日志和同步移除攻击加成
                // （该隐印记的持续时间减少已在processStatusEffects的通用逻辑中处理）
                
                // 火翼的护盾处理（如果需要）
                if (effect.name === "火翼的护盾" && effect.value) {
                    // 护盾在受到伤害时减少，这里可以添加相关逻辑
                }
            });
        }

        // 触发状态效果处理完成事件
        character.trigger('status_effects_processing_end', {
            triggerTime: triggerTime,
            removedEffects: effectsToRemove,
            remainingEffects: character.statusEffects
        });
    }

    // 新增方法：处理新回合开始（事件化版本）
    handleNewTurnStart(newCharacter) {
        newCharacter.isActive = true;

        // 触发角色激活事件
        newCharacter.trigger('character_activated', {
            isActive: true
        });

        // 处理回合开始时的特殊效果（如眩晕）
        newCharacter.statusEffects.forEach(effect => {
            if (effect.triggerTime === 'start' && effect.isStunned) {
                if (newCharacter.canBeStunned && newCharacter.canBeStunned()) {
                    this.addLog(`${newCharacter.name}被眩晕，无法行动`, 'debuff');

                    // 触发眩晕效果事件
                    newCharacter.trigger('stun_effect_triggered', {
                        effect: effect
                    });
                }
            }
        });

        // 触发新回合开始处理完成事件
        newCharacter.trigger('new_turn_start_complete');
        
        // 不再在这里处理"下回合给予该隐印记"，改为在processStatusEffects中当buff消失时触发

        // 处理回合开始时的状态效果（包括减少duration和移除过期效果）
        this.handleTurnStartEffects(newCharacter);
        
        // 处理额外行动次数
        if (newCharacter.extraActionCount && newCharacter.extraActionCount > 0) {
            newCharacter.hasExtraAction = true;
            newCharacter.extraActionCount--;
            this.addLog(`${newCharacter.name} 获得额外行动机会（剩余 ${newCharacter.extraActionCount} 次）`, 'buff');
        }
    }
    
    // 给予该隐印记
    grantCainMark(yushi, count) {
        const allies = this.characters.filter(c => c.type === 'ally' && c.currentHp > 0 && c !== yushi);
        
        // 优先选择钫酸
        const fangsuan = allies.find(c => c.name === "钫酸");
        const recipients = [];
        
        if (fangsuan) {
            recipients.push(fangsuan);
        }
        
        // 添加其他盟友，直到达到指定数量
        for (let ally of allies) {
            if (recipients.length >= count) break;
            if (ally !== fangsuan) {
                recipients.push(ally);
            }
        }
        
        // 给自身和选中的队友添加该隐印记
        [yushi, ...recipients].forEach(char => {
            // 查找或创建该隐印记
            let cainMark = char.statusEffects.find(e => e.name === "该隐印记");
            if (!cainMark) {
                // 不存在，创建新的该隐印记，持续10回合
                cainMark = new StatusEffect("该隐印记", 10);
                cainMark.turnType = 'self';
                cainMark.triggerTime = 'end';
                cainMark.owner = char;
                cainMark.value = 1; // 存储层数，初始为1层
                cainMark.appliedTurn = this.turnCount || 0;
                char.statusEffects.push(cainMark);
                this.addLog(`${char.name} 获得该隐印记（层数：1，攻击力+30%，持续10回合）`, 'buff');
            } else {
                // 已存在，累加层数并重置持续时间
                cainMark.value = (cainMark.value || 1) + 1; // 增加层数
                cainMark.duration = 10; // 重置持续时间为10回合
                cainMark.appliedTurn = this.turnCount || 0; // 更新应用回合
                this.addLog(`${char.name} 的该隐印记叠加至 ${cainMark.value} 层（攻击力+${(0.3 * cainMark.value * 100).toFixed(0)}%），持续时间重置为10回合`, 'buff');
            }
            
            // 更新攻击力加成（根据层数）
            let attackEffect = char.statusEffects.find(e => e.name === "该隐印记-攻击");
            if (!attackEffect) {
                char.addStatusEffect("该隐印记-攻击", "attackPercent", 0.3 * cainMark.value, 10, 'self', 'end');
            } else {
                attackEffect.attackPercent = 0.3 * cainMark.value;
                attackEffect.duration = 10; // 同时重置攻击加成的持续时间
            }
        });
    }


    moveToNextAliveCharacter() {
        const aliveCharacters = this.getAliveCharacters();
        if (aliveCharacters.length === 0) return;

        const currentIndex = this.currentTurnIndex;
        while (true) {
            this.currentTurnIndex = (this.currentTurnIndex + 1) % this.characters.length;
            if (this.characters[this.currentTurnIndex].currentHp > 0) break;
            if (this.currentTurnIndex === currentIndex) break;
        }

        this.characters[this.currentTurnIndex].isActive = true;
    }

    checkGameEnd() {
        const alliesAlive = this.getAllies().filter(char => char.currentHp > 0).length;
        const enemiesAlive = this.getEnemies().filter(char => char.currentHp > 0).length;

        if (alliesAlive === 0) {
            this.addLog("战斗失败！我方队伍被击败了", 'damage');
            this.isGameOver = true;
        } else if (enemiesAlive === 0) {
            this.addLog("战斗胜利！敌方队伍被击败了", 'heal');
            this.isGameOver = true;
        }
    }

    addLog(message, type = 'normal') {
        const colors = {
            normal: '#e0e0ff',
            damage: '#ff4d7a',
            heal: '#00ff88',
            Point: '#ffd166',
            buff: '#a78bfa',
            debuff: '#ff8e53'
        };

        this.log.unshift({ message, color: colors[type] });
    }

    resetGame() {
        this.isGameOver = false;
        this.currentTurnIndex = 0;
        this.turnCount = 1;
        this.log = [{ message: "战斗开始！", color: '#e0e0ff' }];
        this.selectedSkill = null;
        this.selectedTarget = null;
        this.isPlayerTurn = true;

        this.characters.forEach(char => {
            char.currentHp = char.maxHp;
            char.currentPoint = 0;
            char.statusEffects = [];
            char.isActive = false;
            char.actionValue = 0; // 重置行动值
        });

        // 初始化速度条系统
        this.initializeSpeedSystem();

        // 设置第一个行动的角色
        let firstCharacter = this.getNextCharacter();
        if (firstCharacter) {
            const firstIndex = this.characters.findIndex(c => c === firstCharacter);
            if (firstIndex >= 0) {
                this.currentTurnIndex = firstIndex;
                this.isPlayerTurn = firstCharacter.type === 'ally';
                firstCharacter.isActive = true;
            }
        } else if (this.characters.length > 0) {
            // 如果没有角色达到行动值，推进直到有人达到
            let iterations = 0;
            while (!firstCharacter && iterations < 100) {
                this.advanceAllCharacters();
                firstCharacter = this.getNextCharacter();
                if (firstCharacter) {
                    const idx = this.characters.findIndex(c => c === firstCharacter);
                    if (idx >= 0) {
                        this.currentTurnIndex = idx;
                        this.isPlayerTurn = firstCharacter.type === 'ally';
                        firstCharacter.isActive = true;
                        break;
                    }
                }
                iterations++;
            }
        }
    }
}

window.GameState = GameState;