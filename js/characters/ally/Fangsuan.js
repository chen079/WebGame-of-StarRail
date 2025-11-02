(function () {
    // ===== 角色模板 =====
    const FangsuanTemplate = {
        name: "钫酸",
        type: "ally",
        tag: "knight",
        maxHp: 4213,
        attack: 4337,
        defense: 1200,
        speed: 137,
        critRate: 0.4,
        critDamage: 0.8,
        maxPoint: 5,
        icon: "🧙",
        image: "./images/characters/ally/Fangsuan.jpeg",
        skills: [
            {
                name: "量子共鸣",
                description: "对敌方单体造成 2000 + 300% 攻击力的伤害。释放技能后，持续到本局结束。当友方造成伤害时，有 90% 概率附加 1000+100%攻击力的伤害",
                targetType: TargetType.SINGLE,
                skillType: SkillType.BASIC,
                damageType: DamageType.QUANTUM,
                tags: [SkillTag.ATTACK, SkillTag.SINGLE_TARGET],
                icon: "⚔️",
                PointCost: -1,
                executeFunc: function (user, target, allCharacters) {
                    // 1. 先执行基础攻击
                    user.Attack("SINGLE", "attack", [2000], [3.0], target, DamageType.QUANTUM, [DamageStyle.BASIC]);

                    // 2. 检查是否已经注册过监听器（避免重复注册）
                    if (!user.quantumResonanceHandler) {
                        user.quantumResonanceHandler = (event) => {
                            const { source, target: damageTarget, damage, skillType } = event.data;

                            // 排除自己造成的伤害，只监听友方（包括自己以外的友方）
                            if (source === user || source.type !== 'ally') return;

                            // 90%概率触发量子共鸣
                            if (Math.random() < 0.9) {
                                // 计算附加伤害：1000 + 100%攻击力
                                const additionalDamage = 1000 + user.getActualAttack() * 1.0;
                                const finalAdditionalDamage = user.calculateDamage(additionalDamage, DamageType.QUANTUM, SkillType.SPECIAL, damageTarget);

                                // 造成附加伤害
                                const survived = damageTarget.takeDamage(finalAdditionalDamage, DamageType.QUANTUM, user);
                                user.Log(`${user.name} 的量子共鸣对${damageTarget.name}造成${finalAdditionalDamage}点附加量子伤害！`, 'buff');

                                if (!survived) {
                                    user.Log(`${damageTarget.name}被量子共鸣击败！`, 'damage');
                                }
                            }
                        };

                        // 注册事件监听器
                        user.onEvent('deal_damage', user.quantumResonanceHandler);
                    }
                }
            },
            {
                name: "死之剑",
                description: "前劈宝剑，发出剑气",
                targetType: TargetType.SINGLE,
                skillType: SkillType.SPECIAL,
                tags: [SkillTag.ATTACK, SkillTag.SPREAD, SkillTag.BREAK],
                icon: "⚰️",
                filter: function (user, target, allCharacters) {  // 修正为3个参数
                    return user.hasStatusEffect("无敌之王的加冕");
                },
                PointCost: 0,
                executeFunc: function (user, target, allCharacters) {
                    const enemies = allCharacters.filter(c => c.type === 'enemy' && c.currentHp > 0);
                    const mainTarget = target || enemies[0];
                    if (!mainTarget) {
                        user.Log("没有可攻击的目标", 'warn');
                        return;
                    }

                    // SPREAD攻击逻辑：主目标+溅射
                    user.Attack("SPREAD", "attack", [2250, 1250], [2.0, 3.0], mainTarget, DamageType.QUANTUM, [DamageStyle.SPREAD]);
                }
            },
            {
                name: "终结技 - 生死别离",
                description: "自身获得无敌，敌方全体受到伤害提升",
                PointCost: 3,
                targetType: TargetType.ALL,
                skillType: SkillType.ULTIMATE,
                damageType: DamageType.PURE,  // 终结技不造成伤害，使用纯粹类型
                tags: [SkillTag.BUFF, SkillTag.DEBUFF, SkillTag.FIELD],
                icon: "💫",
                executeFunc: function (user, target, allCharacters) {
                    // 使用完善后的 addStatusEffect 方法
                    user.addStatusEffect("无敌之王的加冕", "immune", true, 3, 'self', 'end');
                    user.addStatusEffect("圣剑的祝福", "damageBonus", 3, 3, 'self', 'end');

                    allCharacters.forEach(c => {
                        if (c.type === 'enemy') {
                            c.addStatusEffect("死之剑的诅咒", "damageTakenBonus", 1.0, 3, 'self', 'end');
                            c.addStatusEffect("死之剑的葬送", "critRateDown", 0.2, 3, 'self', 'end');
                        }
                    });

                    user.Log(`${user.name} 释放终结技：生死别离！`, 'buff');
                }
            },
        ]
    };

    window.FangsuanTemplate = FangsuanTemplate;

    window.registerFangsuan = function (loader) {
        loader.registerCharacterTemplate("Fangsuan", FangsuanTemplate);
        // 不创建实例，只注册模板
        // return loader.createCharacter("Fangsuan");
    };
})();