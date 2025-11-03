class Character {
    constructor(name, type, maxHp, attack, defense, speed, critRate, critDamage, maxPoint, skills, icon = "🚀", image = '', level = 80) {
        // 生成唯一UUID
        this.uuid = this.generateUUID();

        this.equipment = new CharacterEquipment(this);
        this.relicStats = {}; // 存储遗器提供的属性
        this.eidolonEffects = {}; // 存储星魂效果

        this.name = name;
        this.type = type;
        this.level = level;
        this.maxHp = maxHp;
        this.currentHp = maxHp;
        this.image = image;

        // 基础属性
        this.baseAttack = attack;        // 攻击白值
        this.baseDefense = defense;      // 防御白值
        this.speed = speed;
        this.critRate = critRate;
        this.critDamage = critDamage;
        this.maxPoint = maxPoint;
        this.currentPoint = 0;

        // 百分比加成
        this.attackPercent = 0;          // 攻击%加成
        this.defensePercent = 0;         // 防御%加成
        this.damageBonus = {};           // 各类伤害加成
        this.breakEffect = 0;            // 击破特攻

        // 特殊属性
        this.defenseIgnore = 0;          // 无视防御%
        this.resistancePenetration = {}; // 抗性穿透
        this.vulnerability = 0;          // 易伤

        this.skills = Array.isArray(skills) ? skills : [];
        this.icon = icon;
        this.statusEffects = [];
        this.isActive = false;
        this.gameState = null;

        // 抗性系统
        this.damageResistances = Object.values(DamageType).reduce((obj, k) => {
            obj[k] = 0;
            return obj;
        }, {});

        // 韧性系统（用于怪物）
        this.toughness = type === 'enemy' ? 100 : 0;
        this.maxToughness = type === 'enemy' ? 100 : 0;
        this.isWeaknessBroken = false;

        // 速度条系统
        this.actionValue = 0;  // 行动值（进度条），初始为0
        this.baseSpeed = speed; // 保存基础速度
        this.hasExtraAction = false; // 是否有额外行动标志
    }

    // 生成UUID（唯一标识符）
    generateUUID() {
        // 使用时间戳、随机数和计数器生成UUID
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 9);
        const counter = (Character.uuidCounter = (Character.uuidCounter || 0) + 1).toString(36);
        return `${timestamp}-${randomPart}-${counter}`;
    }

    // 获取实际攻击力（考虑各种加成）
    // 获取实际攻击力（考虑各种加成）
    getActualAttack() {
        let attackBonus = this.attackPercent;

        // 从状态效果中获取攻击加成
        this.statusEffects.forEach(effect => {
            if (effect.attackBonus) attackBonus += effect.attackBonus;
            if (effect.attackPercent) attackBonus += effect.attackPercent;
        });

        // 基础攻击力 × (1 + 百分比加成) + 遗器提供的固定攻击力
        const baseAttack = this.baseAttack * (1 + attackBonus);
        const relicAttack = this.relicStats?.attack || 0;

        return baseAttack + relicAttack;
    }

    // 获取实际防御力
    getActualDefense() {
        let defenseBonus = this.defensePercent;
        let defenseReduction = 0;

        this.statusEffects.forEach(effect => {
            if (effect.defenseBonus) defenseBonus += effect.defenseBonus;
            if (effect.defensePercent) defenseBonus += effect.defensePercent;
            if (effect.defenseReduction) defenseReduction += effect.defenseReduction;
        });

        // 基础防御力 × (1 + 百分比加成) × (1 - 防御减免) + 遗器提供的固定防御力
        const baseDefense = this.baseDefense * (1 + defenseBonus) * (1 - defenseReduction);
        const relicDefense = this.relicStats?.defense || 0;

        return baseDefense + relicDefense;
    }

    // 获取实际速度（考虑状态效果和遗器）
    getActualSpeed() {
        let totalSpeed = this.speed;

        // 状态效果提供的速度加成
        this.statusEffects.forEach(effect => {
            if (effect.speedBonus) totalSpeed += effect.speedBonus;
        });

        // 遗器提供的速度加成
        const relicSpeed = this.relicStats?.speed || 0;

        return Math.max(1, totalSpeed + relicSpeed);
    }

    // 获取实际生命值（考虑状态效果和遗器）
    getActualMaxHp() {
        let hpBonus = 0;

        // 从状态效果中获取生命值加成
        this.statusEffects.forEach(effect => {
            if (effect.hpBonus) hpBonus += effect.hpBonus;
            if (effect.hpPercent) hpBonus += effect.hpPercent;
        });

        // 基础生命值 × (1 + 百分比加成) + 遗器提供的固定生命值
        const baseHp = this.maxHp * (1 + hpBonus);
        const relicHp = this.relicStats?.hp || 0;

        return baseHp + relicHp;
    }

    // 获取当前生命值百分比
    getHpPercent() {
        const actualMaxHp = this.getActualMaxHp();
        return actualMaxHp > 0 ? (this.currentHp / actualMaxHp) * 100 : 0;
    }

    // 获取生命值状态描述
    getHpStatus() {
        const percent = this.getHpPercent();
        if (percent >= 70) return '健康';
        if (percent >= 40) return '受伤';
        if (percent >= 20) return '重伤';
        return '濒死';
    }

    // 增加行动值
    advanceActionValue() {
        this.actionValue += this.getActualSpeed();
    }

    // 检查是否可以行动（行动值达到500的倍数）
    canTakeAction() {
        return this.actionValue >= 500;
    }

    // 消耗行动（减去500）
    consumeAction() {
        if (this.actionValue >= 500) {
            this.actionValue -= 500;
            return true;
        }
        return false;
    }

    trigger(eventName, eventData = {}) {
        // 自动添加角色信息到事件数据中
        const enhancedData = {
            ...eventData,
            source: this,
            sourceName: this.name,
            sourceType: this.type,
            timestamp: Date.now()
        };

        return window.eventSystem.trigger(eventName, enhancedData);
    };

    onEvent(eventName, callback, options = {}) {
        return window.eventSystem.on(eventName, callback, options);
    };

    onceEvent(eventName, callback, priority = 0) {
        return window.eventSystem.once(eventName, callback, priority);
    };

    updateStatusEffects() {
        this.statusEffects = this.statusEffects.filter(effect => {
            effect.duration -= 1;
            return effect.duration > 0;
        });
    }

    gainPoint(amount) {
        this.currentPoint = Math.min(this.maxPoint, this.currentPoint + amount);
    }

    usePoint(amount) {
        if (this.currentPoint >= amount) {
            this.currentPoint -= amount;
            return true;
        }
        return false;
    }

    canUseSkill(skillType) {
        // 检查是否被沉默
        if (this.statusEffects.some(effect => effect.isSilenced)) {
            return false;
        }

        // 检查是否被眩晕
        if (this.statusEffects.some(effect => effect.isStunned)) {
            return false;
        }

        return true;
    }

    // 添加技能目标选择相关方法
    requiresTargetSelection() {
        return this.targetType === TargetType.SINGLE;
    }

    getTargetDescription() {
        const targetTypes = {
            [TargetType.SINGLE]: '单体目标',
            [TargetType.ALL_ENEMIES]: '全体敌人',
            [TargetType.ALL_ALLIES]: '全体友方',
            [TargetType.ALL]: '全体',
            [TargetType.SELF]: '自身'
        };
        return targetTypes[this.targetType] || '选择目标';
    }

    // ===== 通用技能接口 =====
    // Character.js - 修复后的完整 Attack 方法
    Attack(type, baseStat = "attack", basenumber = [100], ratio = [1.0], target = this, damageType = DamageType.PHYSICAL, damageStyle = [], times = 1, skillType = SkillType.BASIC) {
        const actualTarget = target || this;

        // 触发攻击前事件
        const beforeAttackResult = this.trigger('before_attack', {
            attackType: type,
            target: actualTarget,
            damageStyle: damageStyle,
            damageType: damageType,
            skillType: skillType
        });

        // 如果攻击被取消，直接返回
        if (beforeAttackResult.cancelled) {
            this.Log(`攻击被取消: ${beforeAttackResult.cancelledBy}`, 'debuff');
            return;
        }

        // 1. 根据 baseStat 获取基础属性值
        const getBaseValue = () => {
            switch (baseStat) {
                case "attack": return this.getActualAttack();
                case "defense": return this.getActualDefense();
                case "maxHp": return this.getActualMaxHp();
                case "currentHp": return this.currentHp;
                default: return this.getActualAttack();
            }
        };

        // 2. 计算单次伤害
        const calculateSingleDamage = (baseValue, baseNum, ratioValue) => {
            return baseNum + baseValue * ratioValue;
        };

        // 3. 执行单次攻击
        const executeSingleAttack = (attackTarget, baseNumIndex = 0, ratioIndex = 0) => {
            if (!attackTarget || attackTarget.currentHp <= 0) return 0;

            const baseValue = getBaseValue();
            const baseNum = basenumber[baseNumIndex] || 0;
            const ratioValue = ratio[ratioIndex] || 0;

            let totalDamage = 0;
            for (let i = 0; i < times; i++) {
                const singleDamage = calculateSingleDamage(baseValue, baseNum, ratioValue);
                totalDamage += singleDamage;
            }

            const finalDamage = this.calculateDamage(totalDamage, damageType, skillType, attackTarget);

            // 触发攻击事件
            this.trigger('attack', {
                attackType: type,
                target: attackTarget,
                damage: finalDamage,
                damageType: damageType,
                skillType: skillType,
                isCrit: this.critArea > 1
            });

            // 执行伤害
            const survived = attackTarget.takeDamage(finalDamage, damageType, this);
            const critText = this.critArea > 1 ? " (暴击!)" : "";
            this.Log(`${this.name}对${attackTarget.name}造成${finalDamage}${critText}点${this.getDamageTypeText(damageType)}伤害`, 'damage');

            if (!survived) {
                this.Log(`${attackTarget.name}被击败了！`, 'damage');
            }

            return finalDamage;
        };

        // 4. 处理生命吸取和魔力吸取
        const processLifestealAndManasteal = (totalDamage) => {
            if (totalDamage <= 0) return;

            this.statusEffects.forEach(effect => {
                if (effect.name === "生命吸取" && effect.value) {
                    const lifesteal = Math.floor(totalDamage * effect.value);
                    this.currentHp = Math.min(this.maxHp, this.currentHp + lifesteal);
                    if (lifesteal > 0) {
                        this.Log(`${this.name} 通过生命吸取恢复 ${lifesteal} 点生命`, 'heal');
                    }
                }
                if (effect.name === "魔力吸取" && effect.value) {
                    const manasteal = effect.value;
                    if (manasteal > 0) {
                        this.gainPoint(manasteal);
                        this.Log(`${this.name} 通过魔力吸取恢复 ${manasteal} 点战技点`, 'Point');
                    }
                }
            });
        };

        // 5. 获取存活的敌人
        const getAliveEnemies = () => {
            return this.GetTargets("ALL_ENEMIES").filter(enemy => enemy.currentHp > 0);
        };

        // 6. 获取相邻目标（修复循环列表问题）
        const getAdjacentTargets = (enemies, mainIndex) => {
            const adjacentTargets = [];

            // 只获取直接相邻的目标，不循环
            if (mainIndex > 0) {
                adjacentTargets.push(enemies[mainIndex - 1]);
            }
            if (mainIndex < enemies.length - 1) {
                adjacentTargets.push(enemies[mainIndex + 1]);
            }

            return adjacentTargets.filter(target => target.currentHp > 0);
        };

        // 主逻辑
        let totalDamageDealt = 0;

        switch (type) {
            case "SINGLE":
                const singleDamage = executeSingleAttack(actualTarget, 0, 0);
                processLifestealAndManasteal(singleDamage);
                break;

            case "AOE":
                const aliveEnemies = getAliveEnemies();
                let aoeTotalDamage = 0;

                aliveEnemies.forEach(enemy => {
                    const damage = executeSingleAttack(enemy, 0, 0);
                    aoeTotalDamage += damage;
                });

                processLifestealAndManasteal(aoeTotalDamage);
                break;

            case "BOUND":
                const boundEnemies = getAliveEnemies();
                if (boundEnemies.length === 0) {
                    this.Log("没有可攻击的敌人", 'debuff');
                    return;
                }

                this.Log(`${this.name} 发动弹射攻击！`, 'damage');
                let boundTotalDamage = 0;

                for (let i = 0; i < times; i++) {
                    // 从存活敌人中随机选择
                    const availableTargets = boundEnemies.filter(enemy => enemy.currentHp > 0);
                    if (availableTargets.length === 0) break;

                    const randomIndex = Math.floor(Math.random() * availableTargets.length);
                    const randomTarget = availableTargets[randomIndex];

                    const baseValue = getBaseValue();
                    const baseNum = basenumber[0] || 0;
                    const ratioValue = ratio[0] || 0;
                    const singleDamage = calculateSingleDamage(baseValue, baseNum, ratioValue);
                    const finalDamage = this.calculateDamage(singleDamage, damageType, skillType, randomTarget);

                    // 触发攻击事件
                    this.trigger('attack', {
                        attackType: type,
                        target: randomTarget,
                        damage: finalDamage,
                        damageType: damageType,
                        skillType: skillType,
                        isCrit: this.critArea > 1
                    });

                    const survived = randomTarget.takeDamage(finalDamage, damageType, this);
                    const critText = this.critArea > 1 ? " (暴击!)" : "";
                    this.Log(`第${i + 1}段弹射对${randomTarget.name}造成${finalDamage}${critText}点${this.getDamageTypeText(damageType)}伤害`, 'damage');

                    if (!survived) {
                        this.Log(`${randomTarget.name}被击败了！`, 'damage');
                    }

                    boundTotalDamage += finalDamage;
                }

                processLifestealAndManasteal(boundTotalDamage);
                break;

            case "SPREAD":
                const spreadEnemies = getAliveEnemies();
                if (spreadEnemies.length === 0) {
                    this.Log("没有可攻击的敌人", 'debuff');
                    return;
                }

                // 找到主目标在存活敌人列表中的位置
                const mainTargetIndex = spreadEnemies.findIndex(enemy => enemy === actualTarget && enemy.currentHp > 0);
                if (mainTargetIndex === -1) {
                    this.Log("主目标无效或已死亡", 'debuff');
                    return;
                }

                this.Log(`${this.name} 发动扩散攻击！`, 'damage');
                let spreadTotalDamage = 0;

                // 对主目标造成伤害（使用第一个倍率）
                const mainDamage = executeSingleAttack(actualTarget, 0, 0);
                spreadTotalDamage += mainDamage;

                // 对相邻目标造成伤害（使用第二个倍率）
                const adjacentTargets = getAdjacentTargets(spreadEnemies, mainTargetIndex);

                adjacentTargets.forEach(adjacentTarget => {
                    const baseValue = getBaseValue();
                    const baseNum = basenumber[1] || (basenumber[0] || 0);
                    const ratioValue = ratio[1] || (ratio[0] || 0);
                    const singleDamage = calculateSingleDamage(baseValue, baseNum, ratioValue);
                    const finalDamage = this.calculateDamage(singleDamage, damageType, skillType, adjacentTarget);

                    // 触发攻击事件
                    this.trigger('attack', {
                        attackType: type,
                        target: adjacentTarget,
                        damage: finalDamage,
                        damageType: damageType,
                        skillType: skillType,
                        isCrit: this.critArea > 1
                    });

                    const survived = adjacentTarget.takeDamage(finalDamage, damageType, this);
                    const critText = this.critArea > 1 ? " (暴击!)" : "";
                    this.Log(`扩散对${adjacentTarget.name}造成${finalDamage}${critText}点${this.getDamageTypeText(damageType)}伤害`, 'damage');

                    if (!survived) {
                        this.Log(`${adjacentTarget.name}被击败了！`, 'damage');
                    }

                    spreadTotalDamage += finalDamage;
                });

                processLifestealAndManasteal(spreadTotalDamage);
                break;

            default:
                console.warn(`未知的攻击类型: ${type}`);
        }
    }

    getAdjacentTargets(enemies, mainIndex) {
        const adjacentTargets = [];

        // 左边的目标
        if (mainIndex > 0) {
            adjacentTargets.push(enemies[mainIndex - 1]);
        }

        // 右边的目标
        if (mainIndex < enemies.length - 1) {
            adjacentTargets.push(enemies[mainIndex + 1]);
        }

        return adjacentTargets;
    }

    Heal(targetMode, amount, ratio = 0) {
        const targets = this.GetTargets(targetMode);
        targets.forEach(t => {
            const healAmt = Math.floor(amount + this.attack * ratio);
            t.currentHp = Math.min(t.maxHp, t.currentHp + healAmt);
            this.Log(`${this.name}治疗了${t.name} ${healAmt} HP`, 'heal');
        });
    }

    GetTargets(mode) {
        const allies = this.gameState.getAllies().filter(c => c.currentHp > 0);
        const enemies = this.gameState.getEnemies().filter(c => c.currentHp > 0);
        switch (mode) {
            case "SINGLE": return [enemies[0]];
            case "ALL_ENEMIES": return enemies;
            case "ALL_ALLIES": return allies;
            case "SELF": return [this];
            case "SPREAD": return enemies.slice(0, 3);
            default: return [];
        }
    }

    ApplyDamage(target, dmg, type = DamageType.PHYSICAL) {
        const result = this.calculateFinalDamage(dmg, type);
        target.takeDamage(result.damage, type, this);
        const critText = result.isCrit ? " (暴击!)" : "";
        this.Log(`${this.name}对${target.name}造成${result.damage}${critText}点${type}伤害`, 'damage');
    }

    // Character.js - 更新 takeDamage 方法
    takeDamage(amount, type, source = null) {
        // 免疫死亡状态检查（检查免疫致命伤次数）
        this.trigger('before_take_damage', {
            damage: amount,
            damageType: type,
            source: source
        });

        let isFatalDamage = amount >= this.currentHp;

        if (isFatalDamage) {
            // 触发致命伤害前事件
            const beforeFatalResult = this.trigger('before_fatal_damage', {
                damage: amount,
                damageType: type,
                source: source
            });

            // 如果事件被取消，直接返回
            if (beforeFatalResult.cancelled) {
                return true;
            }

            // 特殊处理：逾柿的"眼的回想"buff
            if (this.name === "逾柿" && this.gameState) {
                // 检查"眼的回想"buff是否存在
                let eyeRecallEffect = this.statusEffects.find(e => e.name === "眼的回想");

                // 如果不存在，检查条件并创建
                if (!eyeRecallEffect) {
                    // 检查所有上场队友是否全部存活（不包括逾柿自己）
                    const allAllies = this.gameState.getAllies();
                    const aliveAllies = allAllies.filter(c => c.currentHp > 0 && c !== this);
                    const totalOtherAllies = allAllies.filter(c => c !== this).length;

                    // 如果除逾柿外的所有队友都存活，则创建buff
                    const allAlive = aliveAllies.length === totalOtherAllies && totalOtherAllies > 0;

                    if (allAlive) {
                        // 创建"眼的回想"buff，持续时间无限，带一次免疫致命伤害
                        eyeRecallEffect = new StatusEffect("眼的回想", 999);
                        eyeRecallEffect.turnType = 'self';
                        eyeRecallEffect.triggerTime = 'end';
                        eyeRecallEffect.owner = this;
                        eyeRecallEffect.isImmuneDeath = true;
                        eyeRecallEffect.value = 1; // 免疫次数：1次
                        eyeRecallEffect.appliedTurn = this.gameState?.turnCount || 0;
                        // 设置 shouldDecrease 为 false，使其不会减少持续时间
                        eyeRecallEffect.shouldDecrease = function () { return false; };
                        this.statusEffects.push(eyeRecallEffect);

                        this.Log(`${this.name} 获得【眼的回想】状态！`, 'buff');
                    }
                }

                // 检测"眼的回想"buff的免疫是否可用（全局一次）
                if (eyeRecallEffect && eyeRecallEffect.isImmuneDeath &&
                    (eyeRecallEffect.value === undefined || eyeRecallEffect.value > 0)) {
                    // 触发免疫，锁血为1
                    eyeRecallEffect.value = (eyeRecallEffect.value || 1) - 1;

                    // 免疫次数用完后，移除免疫效果标记但保留buff
                    if (eyeRecallEffect.value <= 0) {
                        eyeRecallEffect.isImmuneDeath = false;
                    }

                    this.currentHp = 1;
                    this.Log(`${this.name} 的【眼的回想】触发！免疫致命伤害，血量保持在1`, 'buff');
                    return true;
                }
            }

            // 检查其他免疫死亡状态
            const otherImmuneEffects = this.statusEffects.filter(e => e.isImmuneDeath &&
                e.name !== "眼的回想" && (e.value === undefined || e.value > 0));

            if (otherImmuneEffects.length > 0) {
                const immuneEffect = otherImmuneEffects[0];
                if (immuneEffect.value === undefined || immuneEffect.value > 0) {
                    immuneEffect.value = (immuneEffect.value || 1) - 1;

                    if (immuneEffect.value <= 0) {
                        // 其他免疫效果，移除整个效果
                        this.statusEffects = this.statusEffects.filter(e => e !== immuneEffect);
                    }
                    this.currentHp = 1;
                    this.Log(`${this.name} 免疫了致命伤害！`, 'buff');
                    return true;
                }
            }
        }

        this.currentHp = Math.max(0, this.currentHp - amount);
        const survived = this.currentHp > 0;

        // 检测角色死亡 - 使用事件系统
        if (!survived && this.gameState) {
            // 触发角色死亡事件
            this.trigger('character_death', {
                source: source,
                damageType: type,
                killedBy: source,
                isAlly: this.type === 'ally'
            });

            // 同时触发全局角色死亡事件
            window.eventSystem.trigger('character_death', {
                character: this,
                source: source,
                damageType: type,
                killedBy: source,
                isAlly: this.type === 'ally'
            });
        }

        this.trigger('take_damage', {
            damage: amount,
            damageType: type,
            source: source,
            survived: survived
        });

        if (source) {
            // 触发造成伤害的事件
            source.trigger('deal_damage', {
                damage: amount,
                damageType: type,
                target: this,
                survived: survived
            });
        }

        return survived;
    }

    // Character.js - 添加完整的伤害计算方法
    calculateDamage(baseDamage, damageType, skillType, target, isBreakDamage = false) {
        // 纯粹伤害（PURE）类型：直接返回原始伤害，不受任何减免影响
        if (damageType === DamageType.PURE) {
            return Math.floor(baseDamage);
        }

        // === 1. 基础伤害区 ===
        const baseDamageArea = baseDamage;

        // === 2. 防御区 ===
        const defenseArea = this.calculateDefenseArea(target);

        // === 3. 双暴区 ===
        const critArea = this.calculateCritArea();

        // === 4. 击破特攻区 ===
        const breakArea = isBreakDamage ? this.calculateBreakArea() : 1;

        // === 5. 增伤区 ===
        const damageBonusArea = this.calculateDamageBonusArea(damageType, skillType);

        // === 6. 易伤区 ===
        const vulnerabilityArea = this.calculateVulnerabilityArea(target);

        // === 7. 虚弱区 === (这里简化处理)
        const weaknessArea = 1; // 通常为1

        // === 8. 减伤区 ===
        const damageReductionArea = this.calculateDamageReductionArea(target);

        // === 9. 抗性区 ===
        const resistanceArea = this.calculateResistanceArea(damageType, target);

        // 最终伤害计算
        let finalDamage = baseDamageArea * defenseArea * critArea * breakArea *
            damageBonusArea * vulnerabilityArea * weaknessArea *
            damageReductionArea * resistanceArea;

        return Math.floor(finalDamage);
    }

    // 防御区计算
    calculateDefenseArea(target) {
        const attackerLevel = this.level;
        const defenderLevel = target.level;
        const defenderDefense = target.getActualDefense();

        // 计算无视防御
        let defenseIgnore = this.defenseIgnore;
        this.statusEffects.forEach(effect => {
            defenseIgnore += effect.defenseIgnore || 0;
        });

        const actualDefense = defenderDefense * (1 - defenseIgnore);

        return (200 + 10 * attackerLevel) / ((200 + 10 * attackerLevel) + actualDefense);
    }

    // 双暴区计算
    calculateCritArea() {
        const isCrit = Math.random() < this.critRate;
        return isCrit ? (1 + this.critDamage) : 1;
    }

    // 击破特攻区计算
    calculateBreakArea() {
        let breakEffect = this.breakEffect;
        this.statusEffects.forEach(effect => {
            breakEffect += effect.breakEffect || 0;
        });
        return 1 + breakEffect;
    }

    // 增伤区计算
    // 修改伤害计算方法，整合所有状态效果加成
    calculateDamageBonusArea(damageType, skillType) {
        let totalBonus = 0;

        // 基础伤害加成
        if (this.damageBonus[damageType]) {
            totalBonus += this.damageBonus[damageType];
        }

        // 技能类型加成
        totalBonus += this.getTotalDamageBonus(skillType);

        // 伤害类型加成
        totalBonus += this.getTotalDamageTypeBonus(damageType);

        // 状态效果提供的所有加成
        this.statusEffects.forEach(effect => {
            totalBonus += effect.getDamageBonus(skillType);
            totalBonus += effect.getDamageTypeBonus(damageType);
        });

        return 1 + totalBonus;
    }

    // 新增方法：获取特定伤害类型的总加成
    getTotalDamageTypeBonus(damageType) {
        let bonus = 0;

        // 角色自身的伤害类型加成
        switch (damageType) {
            case DamageType.PHYSICAL: bonus += this.damageBonus.physical || 0; break;
            case DamageType.FIRE: bonus += this.damageBonus.fire || 0; break;
            case DamageType.ICE: bonus += this.damageBonus.ice || 0; break;
            case DamageType.LIGHTNING: bonus += this.damageBonus.lightning || 0; break;
            case DamageType.QUANTUM: bonus += this.damageBonus.quantum || 0; break;
            case DamageType.IMAGINARY: bonus += this.damageBonus.imaginary || 0; break;
            case DamageType.WIND: bonus += this.damageBonus.wind || 0; break;
        }

        return bonus;
    }

    // 易伤区计算
    calculateVulnerabilityArea(target) {
        let vulnerability = target.vulnerability;
        target.statusEffects.forEach(effect => {
            vulnerability += effect.vulnerability || 0;
            vulnerability += effect.damageTakenBonus || 0;
        });

        // 该隐印记：对敌方施加负面效果强度加20%
        // 这里处理该隐印记持有者攻击时，对敌方的负面效果强度加成
        const cainMark = this.statusEffects.find(e => e.name === "该隐印记");
        if (cainMark && cainMark.value > 0 && target.type === 'enemy') {
            // 对易伤效果增加20%强度
            vulnerability *= 1.2;
        }

        return 1 + vulnerability;
    }

    // 减伤区计算
    calculateDamageReductionArea(target) {
        let damageReduction = 0;
        target.statusEffects.forEach(effect => {
            damageReduction += effect.damageReduction || 0;
        });

        // 韧性减伤（怪物韧性未破时）
        if (target.type === 'enemy' && !target.isWeaknessBroken && target.toughness > 0) {
            damageReduction += 0.1; // 10%韧性减伤
        }

        return 1 - damageReduction;
    }

    // 抗性区计算
    calculateResistanceArea(damageType, target) {
        // 基础抗性
        let baseResistance = 0;
        if (target.type === 'enemy') {
            baseResistance = 0.2; // 20%基础抗性
        }

        // 角色抗性
        const characterResistance = target.damageResistances[damageType] || 0;

        // 抗性降低（来自攻击者的状态效果）
        let resistanceReduction = 0;
        this.statusEffects.forEach(effect => {
            resistanceReduction += effect.getResistanceReduction(damageType);
        });

        // 抗性穿透（来自攻击者的状态效果）
        let resistancePenetration = this.resistancePenetration[damageType] || 0;
        this.statusEffects.forEach(effect => {
            resistancePenetration += effect.getResistancePenetration(damageType);
        });

        // 目标身上的抗性降低效果
        target.statusEffects.forEach(effect => {
            resistanceReduction += effect.getResistanceReduction(damageType);
        });

        const finalResistance = baseResistance + characterResistance - resistanceReduction - resistancePenetration;

        return Math.max(0, Math.min(2, 1 - finalResistance));
    }

    Log(msg, type = 'normal') {
        if (this.gameState?.addLog) this.gameState.addLog(msg, type);
        else console.log(msg);
    }

    canAct() {
        // 不能行动条件：死亡或眩晕等控制状态
        if (this.currentHp <= 0) return false;
        if (this.hasStatusType("stun")) return false;
        return true;
    }

    canUseSkill(skillType) {
        if (this.currentHp <= 0) return false;
        if (this.hasStatusType("stun")) return false;

        // 检查是否被沉默（不影响终极技和特殊技）
        if (this.hasStatusType("silence")) {
            return skillType === SkillType.ULTIMATE || skillType === SkillType.SPECIAL;
        }

        return true;
    }

    hasStatusEffect(name) {
        return this.statusEffects.some(se => se.name === name);
    }

    addStatusEffect(name, type, value, duration = 3, turnType = 'all', triggerTime = 'end', extraParams = {}) {
        // 创建基础状态效果
        const effect = new StatusEffect(name, duration);
        effect.turnType = turnType;
        effect.triggerTime = triggerTime;
        effect.owner = this;
        effect.appliedTurn = this.gameState?.turnCount || 0;

        // 根据类型设置不同的效果属性
        switch (type) {
            // === 基础属性加成 ===
            case "attackBonus":
                effect.attackBonus = value;
                break;
            case "defenseBonus":
                effect.defenseBonus = value;
                break;
            case "speedBonus":
                effect.speedBonus = value;
                break;

            // === 百分比属性加成 ===
            case "attackPercent":
                effect.attackPercent = value;
                break;
            case "defensePercent":
                effect.defensePercent = value;
                break;

            // === 伤害加成区 ===
            case "damageBonus":
                effect.damageBonus = value;
                break;
            case "basicAttackBonus":
                effect.basicAttackBonus = value;
                break;
            case "skillBonus":
                effect.skillBonus = value;
                break;
            case "ultimateBonus":
                effect.ultimateBonus = value;
                break;
            case "followUpBonus":
                effect.followUpBonus = value;
                break;

            // === 伤害类型加成 ===
            case "physicalBonus":
                effect.physicalBonus = value;
                break;
            case "fireBonus":
                effect.fireBonus = value;
                break;
            case "iceBonus":
                effect.iceBonus = value;
                break;
            case "lightningBonus":
                effect.lightningBonus = value;
                break;
            case "quantumBonus":
                effect.quantumBonus = value;
                break;
            case "imaginaryBonus":
                effect.imaginaryBonus = value;
                break;
            case "windBonus":
                effect.windBonus = value;
                break;

            // === 易伤和抗性区 ===
            case "damageTakenBonus":
                effect.damageTakenBonus = value;
                break;
            case "vulnerability":
                effect.vulnerability = value;
                break;

            // === 抗性相关 ===
            case "resistanceReduction":
                effect.resistanceReduction = value; // value 应该是对象 {物理: 0.1}
                break;
            case "defenseIgnore":
                effect.defenseIgnore = value;
                break;
            case "resistancePenetration":
                effect.resistancePenetration = value; // value 应该是对象 {物理: 0.1}
                break;

            // === 击破相关 ===
            case "breakEffect":
                effect.breakEffect = value;
                break;
            case "breakEfficiency":
                effect.breakEfficiency = value;
                break;

            // === 特殊状态 ===
            case "immune":
                effect.isImmuneDeath = true;
                break;
            case "silence":
                effect.isSilenced = true;
                break;
            case "stun":
                effect.isStunned = true;
                effect.triggerTime = 'start';
                break;
            case "freeze":
                effect.isFrozen = true;
                effect.triggerTime = 'start';
                break;
            case "burn":
                effect.isBurned = true;
                break;
            case "shock":
                effect.isShocked = true;
                break;

            // === 自定义效果类型 ===
            case "damageReduction":
                effect.damageReduction = value;
                break;
            case "lifesteal":
                effect.value = value; // 存储生命吸取比例
                break;
            case "manasteal":
                effect.value = value; // 存储魔力吸取比例
                break;

            default:
                console.warn(`未知的状态效果类型: ${type}`);
                return;
        }

        // 处理额外参数
        if (extraParams.turnType) effect.turnType = extraParams.turnType;
        if (extraParams.triggerTime) effect.triggerTime = extraParams.triggerTime;

        // 检查是否已存在同名效果
        const existingIndex = this.statusEffects.findIndex(eff => eff.name === name);
        if (existingIndex !== -1) {
            this.statusEffects[existingIndex] = effect;
        } else {
            this.statusEffects.push(effect);
            this.Log(`${this.name}获得状态【${name}】`, 'buff');
        }

        return effect;
    }

    // 新增方法：获取特定伤害类型的总加成
    getTotalDamageTypeBonus(damageType) {
        let bonus = 0;

        // 角色自身的伤害类型加成
        switch (damageType) {
            case DamageType.PHYSICAL: bonus += this.damageBonus.physical || 0; break;
            case DamageType.FIRE: bonus += this.damageBonus.fire || 0; break;
            case DamageType.ICE: bonus += this.damageBonus.ice || 0; break;
            case DamageType.LIGHTNING: bonus += this.damageBonus.lightning || 0; break;
            case DamageType.QUANTUM: bonus += this.damageBonus.quantum || 0; break;
            case DamageType.IMAGINARY: bonus += this.damageBonus.imaginary || 0; break;
            case DamageType.WIND: bonus += this.damageBonus.wind || 0; break;
        }

        return bonus;
    }

    // 新增方法：批量添加状态效果
    addMultipleStatusEffects(effects) {
        effects.forEach(effectConfig => {
            this.addStatusEffect(
                effectConfig.name,
                effectConfig.type,
                effectConfig.value,
                effectConfig.duration,
                effectConfig.turnType,
                effectConfig.triggerTime,
                effectConfig.extraParams
            );
        });
    }

    getDamageTypeText(damageType) {
        const texts = {
            [DamageType.PHYSICAL]: '物理',
            [DamageType.FIRE]: '火',
            [DamageType.ICE]: '冰',
            [DamageType.LIGHTNING]: '雷',
            [DamageType.QUANTUM]: '量子',
            [DamageType.IMAGINARY]: '虚数',
            [DamageType.WIND]: '风',
            [DamageType.PURE]: '真实'
        };
        return texts[damageType] || damageType;
    }

    // 检查是否有特定类型的状态效果
    hasStatusType(type) {
        return this.statusEffects.some(effect => {
            switch (type) {
                case "silence": return effect.isSilenced;
                case "stun": return effect.isStunned;
                case "immune": return effect.isImmuneDeath;
                default: return false;
            }
        });
    }

    // 移除特定类型的状态效果
    removeStatusType(type) {
        this.statusEffects = this.statusEffects.filter(effect => {
            switch (type) {
                case "silence": return !effect.isSilenced;
                case "stun": return !effect.isStunned;
                case "immune": return !effect.isImmuneDeath;
                default: return true;
            }
        });
    }

    // 获取所有状态效果的总加成
    getTotalDamageBonus(skillType) {
        return this.statusEffects.reduce((total, effect) => {
            return total + effect.getDamageBonus(skillType);
        }, 0);
    }

    // 检查是否可以被眩晕（免疫死亡状态可能免疫眩晕）
    canBeStunned() {
        return !this.hasStatusType("immune");
    }
}

window.Character = Character;