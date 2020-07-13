
var RealBattleMode = {
	BATTLESTART: 0,
	BATTLE: 1,
	ACTIONSTART: 2,
	ACTIONEND: 3,
	BATTLEEND: 4,
	IDLE: 5,
	DELAY: 6
};

// 解像度が800×600以上の場合において、WIDTHを800にすれば戦闘背景を全て表示できる
var RealBattleArea = {
	WIDTH: 640,
	HEIGHT: 480
};

var RealBattle = defineObject(BaseBattle,
{
	_parentCoreAttack: null,
	_isBattleLayoutVisible: false,
	_isMotionBaseScroll: false,
	_idleCounter: null,
	_autoScroll: null,
	_uiBattleLayout: null,
	_battleArea: null,
	
	openBattleCycle: function(coreAttack) {
		this._prepareBattleMemberData(coreAttack);
		this._completeBattleMemberData(coreAttack);
	},
	
	moveBattleCycle: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === RealBattleMode.BATTLESTART) {
			result = this._moveBattleStart();
		}
		else if (mode === RealBattleMode.BATTLE) {
			result = this._moveBattle();
		}
		else if (mode === RealBattleMode.ACTIONSTART) {
			result = this._moveActionStart();
		}
		else if (mode === RealBattleMode.ACTIONEND) {
			result = this._moveActionEnd();
		}
		else if (mode === RealBattleMode.BATTLEEND) {
			result = this._moveBattleEnd();
		}
		else if (mode === RealBattleMode.IDLE) {
			result = this._moveIdle();
		}
		else if (mode === RealBattleMode.DELAY) {
			result = this._moveDelay();
		}
		
		this._moveAnimation();
		
		return result;
	},
	
	drawBattleCycle: function() {
		var mode = this.getCycleMode();
		
		if (this._isBattleLayoutVisible) {
			this._uiBattleLayout.drawBattleLayout();
		}
		
		if (mode === RealBattleMode.BATTLESTART) {
			this._drawBattleStart();
		}
		else if (mode === RealBattleMode.ACTIONSTART) {
			this._drawActionStart();
		}
		else if (mode === RealBattleMode.ACTIONEND) {
			this._drawActionEnd();
		}
		else if (mode === RealBattleMode.BATTLEEND) {
			this._drawBattleEnd();
		}
	},
	
	backBattleCycle: function() {
		this._moveBattlerAnimation();
	},
	
	eraseRoutine: function(alpha) {
		var active = this.getActiveBattler();
		var passive = this.getPassiveBattler();
		
		if (DamageControl.isLosted(active.getUnit())) {
			active.setColorAlpha(alpha);
		}
		
		if (DamageControl.isLosted(passive.getUnit())) {
			passive.setColorAlpha(alpha);
		}
	},
	
	endBattle: function() {
		this._battleTable.endMusic();
		this._uiBattleLayout.endBattleLayout();
	},
	
	setBattleLayoutVisible: function(isVisible) {
		this._isBattleLayoutVisible = isVisible;
		this._uiBattleLayout.startBattleLayout();
	},
	
	startExperienceScroll: function(unit) {
		var battler = this._getPlayerBattler(unit);
		
		this._autoScroll.startScroll(battler.getKeyX());
	},
	
	getEffectPosFromUnit: function(animeData, unit) {
		var battler = this._getPlayerBattler(unit);
		var pos = battler.getEffectPos(animeData);
		
		return {
			x: pos.x - this._autoScroll.getScrollX(),
			y: pos.y
		};
	},
	
	getBattleArea: function() {
		return this._battleArea;
	},
	
	moveAutoScroll: function() {
		return this._autoScroll.moveAutoScroll();
	},
	
	doHitAction: function() {
		var order = this._order;
		var isHit = order.isCurrentHit();
		var damageActive = order.getActiveDamage();
		var damagePassive = order.getPassiveDamage();
		var battlerActive = this.getActiveBattler();
		var battlerPassive = this.getPassiveBattler();
		
		if (isHit) {
			// 攻撃を受ける側のHPを減らし、ダメージをUI表示できるようにする
			this._checkDamage(order.getActiveUnit(), damagePassive, battlerPassive);
			
			// 攻撃をする側のHPを減らし、ダメージをUI表示できるようにする。
			// 通常、攻撃をする側にダメージ、もしくは回復が行われることはないため、
			// このif文は原則実行されない。
			if (damageActive !== 0) {
				this._checkDamage(order.getPassiveUnit(), damageActive, battlerActive);
			}
			
			battlerPassive = this.getPassiveBattler();
			
			// 相手が待機である場合は、これによって待機が終了する
			battlerPassive.setDamageState();
		}
		else {
			battlerPassive = this.getPassiveBattler();
			this._uiBattleLayout.showAvoidAnime(battlerPassive);
			
			// 攻撃が命中しなかったため、相手を回避にする
			battlerPassive.setAvoidState();
		}
		
		return isHit;
	},
	
	setMotionBaseScroll: function(isMotionBaseScroll) {
		this._isMotionBaseScroll = isMotionBaseScroll;
	},
	
	getAutoScroll: function() {
		return this._autoScroll;
	},
	
	forceAutoScroll: function(x) {
		if (this._autoScroll.isApproach()) {
			this._endScrollAction();
		}
		else {
			// 接近していない場合は相手に向かってスクロール
			this._autoScroll.startScroll(x);
			this.changeCycleMode(RealBattleMode.DELAY);
		}
	},
	
	getNextBattler: function(isActive) {
		var unit;
		
		// 一時的に次のオーダーに進める
		if (!this._order.nextOrder()) {
			return null;
		}
		
		if (isActive) {
			unit = this._order.getActiveUnit();
		}
		else {
			unit = this._order.getPassiveUnit();
		}
		
		// 進めたオーダーを戻す
		this._order.prevOrder(); 
		
		if (unit === this._battlerRight.getUnit())
			return this._battlerRight;
		
		return this._battlerLeft;
	},
	
	_prepareBattleMemberData: function(coreAttack) {
		this._parentCoreAttack = coreAttack;
		this._attackFlow = this._parentCoreAttack.getAttackFlow();
		this._order = this._attackFlow.getAttackOrder();
		this._attackInfo = this._attackFlow.getAttackInfo();
		this._battleTable = createObject(RealBattleTable);
		this._isMotionBaseScroll = false;
		this._effectArray = [];
		this._idleCounter = createObject(IdleCounter);
		this._autoScroll = createObject(RealAutoScroll);
		this._battleTransition = createObject(BattleTransition);
		this._uiBattleLayout = createObject(UIBattleLayout);
		
		this._createBattleArea();
	},
	
	_completeBattleMemberData: function(coreAttack) {
		this._createBattler();
	
		this._autoScroll.setScrollX(this.getActiveBattler().getFocusX());
		
		this._uiBattleLayout.setBattlerAndParent(this._battlerRight, this._battlerLeft, this);
		
		this._battleTable.setBattleObject(this);
		this._battleTable.enterBattleStart();
		this.changeCycleMode(RealBattleMode.BATTLESTART);
	},
	
	_createBattler: function() {
		var unitSrc = this._attackInfo.unitSrc;
		var unitDest = this._attackInfo.unitDest;
		var isRight = Miscellaneous.isUnitSrcPriority(unitSrc, unitDest);
		var versusType = this._getVersusType(unitSrc, unitDest);
		
		// this._battlerRightが自軍を基に作成される点が重要(自軍は常に右側に表示したいため)
		if (isRight) {
			// こちらが実行される場合、unitSrcが自軍でunitDestが敵軍になっている
			this._battlerRight = createObject(this._getBattlerObject(unitSrc));
			this._battlerLeft = createObject(this._getBattlerObject(unitDest));
			
			this._setBattlerData(this._battlerRight, unitSrc, true, true, versusType);
			this._setBattlerData(this._battlerLeft, unitDest, false, false, versusType);
		}
		else {
			// こちらが実行される場合、unitDestが自軍でunitSrcが敵軍になっている
			this._battlerRight = createObject(this._getBattlerObject(unitDest));
			this._battlerLeft = createObject(this._getBattlerObject(unitSrc));
			
			this._setBattlerData(this._battlerRight, unitDest, false, true, versusType);
			this._setBattlerData(this._battlerLeft, unitSrc, true, false, versusType);
		}
	},
	
	_setBattlerData: function(battler, unit, isSrc, isRight, versusType) {
		var motionId, pos;
		var animeData = BattlerChecker.findBattleAnimeFromUnit(unit);
		var motionParam = StructureBuilder.buildMotionParam();
		var order = this.getAttackOrder();
		var attackInfo = this.getAttackInfo();
		
		if (unit === attackInfo.unitSrc) {
			motionId = order.getWaitIdSrc();
		}
		else {
			motionId = order.getWaitIdDest();
		}
		
		motionParam.animeData = animeData;
		motionParam.unit = unit;
		motionParam.isRight = isRight;
		motionParam.motionColorIndex = Miscellaneous.getMotionColorIndex(unit);
		motionParam.motionId = motionId;
		motionParam.versusType = versusType;
		
		pos = BattlerPosChecker.getRealInitialPos(motionParam, isSrc, order);
		motionParam.x = pos.x;
		motionParam.y = pos.y;
		
		battler.setupRealBattler(motionParam, isSrc, this);
	},
	
	_createBattleArea: function() {
		this._battleArea = {};
		this._battleArea.x = 0;
		this._battleArea.y = 0;
		this._battleArea.width = RealBattleArea.WIDTH;
		this._battleArea.height = RealBattleArea.HEIGHT;
	},
	
	_getVersusType: function(unitSrc, unitDest) {
		var versusType;
		var animeSrc = BattlerChecker.findBattleAnimeFromUnit(unitSrc);
		var animeDest = BattlerChecker.findBattleAnimeFromUnit(unitDest);
		var srcSize = animeSrc.getSize();
		var destSize = animeDest.getSize();
		var s = 0;
		var m = 1;
		
		if (srcSize === s) {
			if (destSize === s) {
				versusType = VersusType.SS;
			}
			else if (destSize === m) {
				versusType = VersusType.SM;
			}
			else {
				versusType = VersusType.SL;
			}
		}
		else if (srcSize === m) {
			if (destSize === s) {
				versusType = VersusType.SM;
			}
			else if (destSize === m) {
				versusType = VersusType.MM;
			}
			else {
				versusType = VersusType.ML;
			}
		}
		else {
			if (destSize === s) {
				versusType = VersusType.SL;
			}
			else if (destSize === m) {
				versusType = VersusType.ML;
			}
			else {
				versusType = VersusType.LL;
			}
		}
		
		return versusType;
	},
	
	_getBattlerObject: function(unit) {
		var object;
		var attackTemplateType = BattlerChecker.findAttackTemplateTypeFromUnit(unit);
		var isDirectAttack = this._attackInfo.isDirectAttack;
		
		if (attackTemplateType === AttackTemplateType.FIGHTER) {
			if (this._attackInfo.checkMagicWeaponAttack(unit)) {
				object = MagicWeaponAttackBattler;
			}
			else {
				if (isDirectAttack) {
					object = DirectBattler;
				}
				else {
					object = IndirectBattler;
				}
			}
		}
		else if (attackTemplateType === AttackTemplateType.ARCHER) {
			object = IndirectBattler;
		}
		else {
			object = MagicBattler;
		}
		
		return object;
	},
	
	_moveBattleStart: function() {
		if (this._battleTable.moveBattleStart() !== MoveResult.CONTINUE) {
			if (!this._attackFlow.validBattle()) {
				// 戦闘を開始できない場合は、直ちに終了する
				this._processModeBattleEnd();
				return MoveResult.CONTINUE;
			}
			
			this._processModeActionStart();
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveBattle: function() {
		if (!this._checkBattleContinue()) {
			return MoveResult.CONTINUE;
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveActionStart: function() {
		if (this._battleTable.moveActionStart() !== MoveResult.CONTINUE) {
			this._changeBattle();
			this.changeCycleMode(RealBattleMode.BATTLE);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveActionEnd: function() {
		if (this._battleTable.moveActionEnd() !== MoveResult.CONTINUE) {
			this._checkNextAttack();
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveBattleEnd: function() {
		if (this._battleTable.moveBattleEnd() !== MoveResult.CONTINUE) {
			this.endBattle();
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveIdle: function() {
		var nextmode;
		
		if (this._idleCounter.moveIdleCounter() !== MoveResult.CONTINUE) {
			nextmode = this._idleCounter.getNextMode();
			
			if (nextmode === RealBattleMode.BATTLE) {
				this._changeBattle();
			}
			
			this.changeCycleMode(nextmode);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveDelay: function() {
		// 画面がスクロール中であり、このときにモーションは動かない
		if (this._autoScroll.moveAutoScroll() !== MoveResult.CONTINUE) {
			this._endScrollAction();
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveAnimation: function() {
		this._moveEffect();
		this._uiBattleLayout.moveBattleLayout();
		
		this._moveBattlerAnimation();
		
		// スクロール値が変更されるのは、2つのパターンがある。
		// 1つはmoveAutoScrollによる変更。
		// これは相手の視点になっているのをこちらの視点に戻すためなどに使用する。
		// もう1つは、モーションの現在位置に応じて変更。
		// これは移動や投てき、投射などが挙げられる。
		// 後者の場合は、setScrollXを呼び出すことでスクロール値を明示的に設定する。
		// ただし、自動モードが有効になっている場合は、moveAutoScrollによるスクロールを優先するべきであるため、
		// その際には変更しない。
		if (this._isMotionBaseScroll) {
			this._autoScroll.setScrollX(this.getActiveBattler().getFocusX());
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveBattlerAnimation: function() {
		if (this._isBattleLayoutVisible) {
			this._battlerRight.moveBattler();
			this._battlerLeft.moveBattler();
		}
	},
	
	_drawBattleStart: function() {
		this._battleTable.drawBattleStart();
	},
	
	_drawActionStart: function() {
		this._battleTable.drawActionStart();
	},
	
	_drawActionEnd: function() {
		this._battleTable.drawActionEnd();
	},
	
	_drawBattleEnd: function() {
		this._battleTable.drawBattleEnd();
	},
	
	_endScrollAction: function() {
		this._processModeActionStart();
	},
	
	_checkBattleContinue: function() {
		var isRightLast = this._battlerRight.isActionLast();
		var isLeftLast = this._battlerLeft.isActionLast();
		
		// 2つのバトラーの動作が停止し、エフェクトの残り数が0であり、さらにUI(ゲージなど)がアニメーションしていない場合
		if (isRightLast && isLeftLast && this._effectArray.length === 0 && this._uiBattleLayout.isUIMoveLast()) {
			this._processModeActionEnd();
		}
		
		return true;
	},
	
	_checkNextAttack : function() {
		var result, battler;
		var battlerPrev = this.getActiveBattler();
		
		this._attackFlow.executeAttackPocess();
		
		result = this._attackFlow.checkNextAttack();
		if (result === AttackFlowResult.DEATH) {
			battler = this.getActiveBattler();
			if (DamageControl.isLosted(battler.getUnit())) {
				battler.lostBattler();
			}
			
			battler = this.getPassiveBattler();
			if (DamageControl.isLosted(battler.getUnit())) {
				battler.lostBattler();
			}
		}
		else if (result === AttackFlowResult.CONTINUE) {
			battler = this.getActiveBattler();
			
			// battlerとbattlerPrevが同一である場合、前回と今回で攻撃するユニットが同一であることを示す
			if (!battler.checkForceScroll(battler === battlerPrev)) {
				this._processModeActionStart();
			}
			
			// 戦闘を続ける
			return true;
		}
		
		this._processModeBattleEnd();
		
		return false;
	},
	
	_checkDamage: function(unit, damage, battler) {
		var order = this._order;
		var isCritical = order.isCurrentCritical();
		var isFinish = order.isCurrentFinish();
		
		if (damage >= 0) {
			WeaponEffectControl.playDamageSound(unit, isCritical, isFinish);
		}
		
		this._uiBattleLayout.setDamage(battler, damage, isCritical, isFinish);
	},
	
	_getPlayerBattler: function(unit) {
		var battler = this.getActiveBattler();
		
		if (battler.getUnit() !== unit) {
			battler = this.getPassiveBattler();
		}
		
		return battler;
	},
	
	_processModeActionStart: function() {
		if (this._battleTable.enterActionStart() === EnterResult.NOTENTER) {
			this._changeBattle();
			this.changeCycleMode(RealBattleMode.BATTLE);
		}
		else {
			this.changeCycleMode(RealBattleMode.ACTIONSTART);
		}
	},
	
	_processModeActionEnd: function() {
		if (this._battleTable.enterActionEnd() === EnterResult.NOTENTER) {
			this._checkNextAttack();
		}
		else {
			this.changeCycleMode(RealBattleMode.ACTIONEND);
		}
	},
	
	_processModeBattleEnd: function() {
		this._battleTable.enterBattleEnd();
		this.changeCycleMode(RealBattleMode.BATTLEEND);
	},
	
	_changeBattle: function() {
		var battler = this.getActiveBattler();
		
		battler.startBattler();
		
		// モーションが動き始めるためtrue
		this._isMotionBaseScroll = true;
	}
}
);

var BaseBattler = defineObject(BaseObject,
{
	_unit: null,
	_isSrc: false,
	_motion: null,
	_isPollingState: false,
	_pollingCounter: null,
	_isWaitForDamage: false,
	_realBattle: null,
	_isWaitLoopZone: false,
	_loopFrameIndex: 0,
	
	setupRealBattler: function(motionParam, isSrc, realBattle) {
		this._unit = motionParam.unit;
		this._isSrc = isSrc;
		this._motion = createObject(AnimeMotion);
		this._realBattle = realBattle;
		
		this._motion.setMotionParam(motionParam);
		this._setWapon();
		
		this._isWaitLoopZone = this._checkNewFrame();
	},
	
	getUnit: function() {
		return this._unit;
	},
	
	moveBattler: function() {
		var motionCategoryType;
		var motion = this._motion;
		
		// 意図的に待機する場合
		if (!this._checkPollingState()) {
			return MoveResult.CONTINUE;
		}
		
		// フレームに設定された表示期間の数だけカウントする
		if (motion.moveMotion() !== MoveResult.CONTINUE) {
			return MoveResult.CONTINUE;
		}
		
		motionCategoryType = this.getMotionCategoryType();
		if (motionCategoryType === MotionCategoryType.NORMAL) {
			this.moveNormal();
		}
		else if (motionCategoryType === MotionCategoryType.APPROACH) {
			this.moveApproach();
		}
		else if (motionCategoryType === MotionCategoryType.ATTACK) {
			this.moveAttack();
		}
		else if (motionCategoryType === MotionCategoryType.AVOID) {
			this.moveAvoidOrDamage();
		}
		else if (motionCategoryType === MotionCategoryType.THROW || motionCategoryType === MotionCategoryType.SHOOT) {
			this.moveThrow();
		}
		else if (motionCategoryType === MotionCategoryType.MAGIC || motionCategoryType === MotionCategoryType.MAGICATTACK) {
			this.moveMagic();
		}
		else if (motionCategoryType === MotionCategoryType.DAMAGE) {
			this.moveAvoidOrDamage();
		}
		
		return MoveResult.CONTINUE;
	},
	
	moveNormal: function() {
		if (this._checkLoopZone()) {
			this._isWaitLoopZone = true;
		}
		
		return MoveResult.CONTINUE;
	},
	
	moveApproach: function() {
		return MoveResult.CONTINUE;
	},
	
	moveAttack: function() {
		return MoveResult.CONTINUE;
	},
	
	moveAvoidOrDamage: function() {
		var unit, motionId, motionCategoryType, isAttack, order;
		
		if (this._checkLoopZone()) {
			// 一時的に次のオーダーに進める
			order = this._realBattle.getAttackOrder();
			if (order.nextOrder()) {
				unit = order.getActiveUnit();
				motionId = order.getActiveMotionId();
				motionCategoryType = this._motion.getAnimeData().getMotionCategoryType(motionId);
				isAttack = motionCategoryType === MotionCategoryType.ATTACK || motionCategoryType === MotionCategoryType.BOW || motionCategoryType === MotionCategoryType.MAGIC;
				
				// 回避またはダメージ受けのユニットが次に攻撃を行う場合は、一時的に何もしない状態にする。
				// これがない場合、待機から攻撃への切り替わりが視覚的に速く感じる。
				if (unit === this._unit && isAttack) {
					this._isPollingState = true;
					this._pollingCounter = createObject(CycleCounter);
					this._pollingCounter.setCounterInfo(4);
				}
				
				// 進めたオーダーを戻す
				order.prevOrder();
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	moveThrow: function() {
		return MoveResult.CONTINUE;
	},
	
	moveMagic: function() {
		return MoveResult.CONTINUE;
	},
	
	drawBattler: function(xScroll, yScroll) {
		this._motion.drawMotion(xScroll, yScroll);
	},
	
	drawScreenColor: function() {
		var color = this._motion.getScreenColor();
		var alpha = this._motion.getScreenAlpha();
		
		root.getGraphicsManager().fillRange(0, 0, root.getGameAreaWidth(), root.getGameAreaHeight(), color, alpha);
	},
	
	getScreenEffectRangeType: function() {
		return this._motion.getScreenEffectRangeType();
	},
	
	checkForceScroll: function(isContinuous) {
		return false;
	},
	
	startBattler: function() {
		this.setAttackState();
	},
	
	isActionLast: function() {
		// 何もしない状態である場合は、モーションが終了したとみなさない
		if (this._isPollingState) {
			return false;
		}
		
		if (this._motion.isLoopMode()) {
			return true;
		}
		
		// 待機のモーションタイプはループするため、isLastFrameで終了判定はできない。
		if (this.getMotionCategoryType() === MotionCategoryType.NORMAL) {
			if (this._isWaitForDamage) {
				// ダメージによる待機では終了
				return true;
			}
			else {
				return false;
			}
		}
		
		return this._motion.isLastFrame();
	},
	
	isLoopZone: function() {
		return this._isWaitLoopZone;
	},
	
	getAttackMotionId: function() {
		return this._realBattle.getAttackOrder().getActiveMotionId();
	},
	
	getPassiveMotionId: function() {
		return this._realBattle.getAttackOrder().getPassiveMotionId();
	},
	
	getMotionCategoryType: function() {
		var motionId = this._motion.getMotionId();
		
		return this._motion.getAnimeData().getMotionCategoryType(motionId);
	},
	
	setAttackState: function() {
		var motionId = this.getAttackMotionId();
		
		this._motion.setMotionId(motionId);
		this._checkNewFrame();
	},
	
	setAvoidState: function() {
		var avoidId = this.getPassiveMotionId();
		
		this._motion.setMotionId(avoidId);
		this._checkNewFrame();
	},
	
	setDamageState: function() {
		var damageId = this.getPassiveMotionId();
		
		if (damageId === -1) {
			// ダメージ受けが設定されていない場合はモーションはそのままになる
			this._isWaitForDamage = true;
		}
		else {
			this._motion.setMotionId(damageId);
		}
		
		this._checkNewFrame();
	},
	
	// 視点が合わさっているスプライトのx座標を取得する
	getFocusX: function() {
		return this._motion.getFocusX();
	},
	
	// キースプライトの移動後のx座標を取得する
	getKeyX: function() {
		return this._motion.getKeyX();
	},
	
	getKeyY: function() {
		return this._motion.getKeyX();
	},
	
	getEffectPos: function(anime) {
		var isRight = this._realBattle.getBattler(true) === this;
		return this._motion.getEffectPos(anime, isRight);
	},
	
	lostBattler: function() {
	},
	
	isSrc: function() {
		return this._isSrc;
	},
	
	setColorAlpha: function(alpha) {
		this._motion.setColorAlpha(alpha);
	},
	
	_setWapon: function() {
		var weapon = BattlerChecker.getRealBattleWeapon(this._unit);
		
		// 装備武器が魔法でない場合は、武器を表示するようにする
		if (weapon !== null && weapon.getWeaponCategoryType() !== AttackTemplateType.MARGE) {
			this._motion.setWeapon(weapon);
		}
	},
	
	_checkPollingState: function() {
		if (this._isPollingState) {
			if (this._pollingCounter.moveCycleCounter() !== MoveResult.CONTINUE) {
				this._isPollingState = false;
			}
			
			return false;
		}
		
		return true;
	},
	
	_checkLoopZone: function() {
		var motion = this._motion;
		
		if (motion.isLoopMode()) {
			if (motion.isLoopEndFrame()) {
				motion.setFrameIndex(this._loopFrameIndex, true);
				return false;
			}
		}
		else if (motion.isLastFrame()) {
			return false;
		}
		
		motion.nextFrame();
		
		return this._checkNewFrame();
	},
	
	_checkNewFrame: function() {
		var isEnd = false;
		var motion = this._motion;
		
		if (motion.isLoopStartFrame()) {
			isEnd = true;
			this._loopFrameIndex = motion.getFrameIndex();
			motion.setLoopMode(true);
		}
		else if (motion.isLastFrame()) {
			isEnd = true;
		}
		
		return isEnd;
	}
}
);

// 戦士系のモーションの動作
var DirectBattler = defineObject(BaseBattler,
{
	moveApproach: function() {
		var motionId, moveId;
		var motion = this._motion;
			
		if (motion.isLastFrame()) {
			return MoveResult.CONTINUE;
		}
		
		motion.nextFrame();
		
		if (motion.isLastFrame()) {
			motionId = motion.getMotionId();
			moveId = this._realBattle.getAttackOrder().getMoveId();
			
			// 移動が完了したため攻撃に入る
			if (motionId === moveId) {
				this._realBattle.getAutoScroll().setNear(true);
				this.setAttackState();
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	moveAttack: function() {
		var motion = this._motion;
		
		if (motion.isLastFrame()) {
			return MoveResult.CONTINUE;
		}
		
		if (motion.isAttackHitFrame()) {
			this._realBattle.doHitAction();
		}
		
		this._checkLoopZone();
		
		if (this._isNextHit()) {
			WeaponEffectControl.playSound(this._unit, WeaponEffectSound.WEAPONWAVE);
		}
		
		return MoveResult.CONTINUE;
	},
	
	getAttackMotionId: function() {
		// ユニットが既に相手と接近しているかを調べる
		if (this._realBattle.getAutoScroll().isApproach()) {
			// 接近している場合は、攻撃IDを返す
			return this._realBattle.getAttackOrder().getActiveMotionId();
		}
		else {
			// 接近していない場合は、接近するために移動IDを返す
			return this._realBattle.getAttackOrder().getMoveId();
		}
	},
	
	_isNextHit: function() {
		var isNextHit;
		var index = this._motion.getFrameIndex();
		
		if (index + 1 === this._motion.getFrameCount()) {
			return false;
		}
		
		// 次のフレームの情報が欲しいため、意図的にフレームを進める
		this._motion.setFrameIndex(index + 1, false);
		
		isNextHit = this._motion.isAttackHitFrame();
		
		// フレームを戻す
		this._motion.setFrameIndex(index, false);
		
		return isNextHit;
	}
}
);

// 武器を投げる戦士系、及び弓兵系のモーションの動作
var IndirectBattler = defineObject(BaseBattler,
{
	_isThrowState: false,
	
	moveThrow: function() {
		var isHit, motionCategoryType;
		var motion = this._motion;
		
		if (motion.isLastFrame()) {
			return MoveResult.CONTINUE;
		}
		
		if (motion.isAttackHitFrame()) {
			isHit = this._realBattle.doHitAction();
			
			if (isHit) {
				// 投てきと投射は命中したら武器を一時的に非表示にする
				motion.hideThrowWeapon(); 
			}
		}
		else if (motion.isThrowStartFrame()) {
			motionCategoryType = this.getMotionCategoryType();
			
			if (motionCategoryType === MotionCategoryType.THROW) {
				this._playThrowSound();
			}
			else if (motionCategoryType === MotionCategoryType.SHOOT) {
				this._playShootSound();
			}
			
			// 投げ状態を記録することで、武器に視点が移るようにする
			this._isThrowState = true;
		}
		
		if (this._checkLoopZone()) {
			// フレームが終了したため、武器を非表示にする
			motion.hideThrowWeapon();
			
			// 投げ状態を解除する
			this._isThrowState = false;
			
			this._realBattle.setMotionBaseScroll(false);
		}
		
		return MoveResult.CONTINUE;
	},
		
	checkForceScroll: function(isContinuous) {
		var motion = this._motion;
		
		// 同じユニットが連続して攻撃する場合
		if (isContinuous) {
			// 矢を放ったことで、視点が相手側になっている。
			// それをこちら側に戻すために、スクロールの命令を出す。
			// スクロールが終了すれば、startBattlerが呼ばれる。
			this._realBattle.forceAutoScroll(motion.getKeyX(), 0);
			return true;
		}
		
		return false;
	},
	
	_playThrowSound: function() {
		WeaponEffectControl.playSound(this._unit, WeaponEffectSound.WEAPONTHROW);
	},
	
	_playShootSound: function() {
		WeaponEffectControl.playSound(this._unit, WeaponEffectSound.SHOOTARROW);
	}
}
);

var MagicBattlerType = {
	NORMAL: 0,
	INVOCATION: 1,
	MAGIC: 2,
	SCROLL: 3
};

// 魔法系のモーションの動作
var MagicBattler = defineObject(BaseBattler,
{
	_invocationEffect: null,
	_magicEffect: null,
	_isLast: false,
	
	setAttackState: function() {
		var motionId = this.getAttackMotionId();
		
		this._motion.setMotionId(motionId);
		
		this._invocationEffect = null;
		this._magicEffect = null;
		this._loopFrameIndex = 0;
		this._isLast = false;
		
		if (this._motion.isLoopStartFrame()) {
			this._startLoop();
		}
		else {
			this.changeCycleMode(MagicBattlerType.NORMAL);
		}
	},
	
	moveBattler: function() {
		if (this.getCycleMode() === MagicBattlerType.SCROLL) {
			if (this._realBattle.getAutoScroll().moveAutoScroll() !== MoveResult.CONTINUE) {
				this._createMagicEffect();
				this.changeCycleMode(MagicBattlerType.MAGIC);
			}
		}
		
		return BaseBattler.moveBattler.call(this);
	},
	
	moveMagic: function() {
		var mode = this.getCycleMode();
		var motion = this._motion;
		
		if (motion.isLastFrame()) {
			return MoveResult.CONTINUE;
		}
		
		if (mode === MagicBattlerType.NORMAL) {
			// 魔法を開始するフレームに入った場合
			if (motion.isLoopStartFrame()) {
				this._startLoop();
			}
		}
		else if (mode === MagicBattlerType.INVOCATION) {
			// 発動エフェクトが終了したかを調べる
			if (this._invocationEffect !== null && this._invocationEffect.isEffectLast()) {
				this._invocationEffect = null;
				this._startMagic();
			}
		}
		else if (mode === MagicBattlerType.MAGIC) {
			// 魔法のエフェクトが終了したかを調べる
			if (this._magicEffect !== null && this._magicEffect.isEffectLast()) {
				this._magicEffect = null;
				
				// これがなければ相手に視点が移る。
				// setFocusMotion(getPassiveMotion());で視点をこちらにすればよいように思えるが、
				// こちらが弓である場合は矢に視点が合うことになり、上手くいかない。
				this._realBattle.setMotionBaseScroll(false);
				
				// 終了フラグを立てることで、ループするのを防ぐ
				this._isLast = true;
			}
		}
		
		if (motion.isLoopEndFrame() && !this._isLast) {
			// ループ開始に戻る
			motion.setFrameIndex(this._loopFrameIndex, true);
		}
		else {
			motion.nextFrame();
		}
		
		if (motion.isLastFrame()) {
			this._isLast = false;
			this.changeCycleMode(MagicBattlerType.NORMAL);
		}
		
		return MoveResult.CONTINUE;
	},
	
	getFocusX: function() {
		var motion = this._motion;
		
		if (this._magicEffect === null) {
			return motion.getFocusX();
		}
		else {
			// エフェクトが発動されている場合は、それに視点を合わせる
			return this._magicEffect.getEffectX();
		}
	},
	
	checkForceScroll: function(isContinuous) {
		var motion = this._motion;
		
		// 同じユニットが連続して攻撃する場合
		if (isContinuous) {
			// スクロールの命令を出すことで、視点を攻撃者の方へ戻す。
			// スクロールが終了すれば、startBattlerが呼ばれる。
			this._realBattle.forceAutoScroll(motion.getKeyX());
			return true;
		}
		
		return false;
	},
	
	_startLoop: function() {
		this._loopFrameIndex = this._motion.getFrameIndex();
		
		this._createInvocationEffect();
		if (this._invocationEffect === null) {	
			// 即座に魔法を発動
			this._startMagic();
		}
		else {
			this.changeCycleMode(MagicBattlerType.INVOCATION);
		}
	},
	
	_startMagic: function() {
		if (this._realBattle.getAutoScroll().isApproach()) {
			this._createMagicEffect();
			this.changeCycleMode(MagicBattlerType.MAGIC);
		}
		else {
			// 接近していない場合は相手に向かってスクロール
			this._realBattle.getAutoScroll().startScroll(this._realBattle.getPassiveBattler().getKeyX());
			
			// 魔法発動のエフェクトが終了したから、実際に魔法を使用することになるが、
			// その前にスクロールの命令を出すことで、視点をターゲットの方へ移動させる。
			this.changeCycleMode(MagicBattlerType.SCROLL);
		}
	},
	
	_createInvocationEffect: function() {
		var isRight, dx, pos;
		var anime = this._getInvocationAnime();
		var weapon = BattlerChecker.getRealBattleWeapon(this._unit);
		var cls = BattlerChecker.getRealBattleClass(this._unit, weapon);
		var clsAnime = cls.getClassAnime(weapon.getWeaponCategoryType());
		
		if (anime === null || clsAnime.isInvocationDisabled(this._motion.getMotionId())) {
			return;
		}
		
		isRight = this === this._realBattle.getBattler(true);
		dx = 50;
		pos = this.getEffectPos(anime);
		
		if (isRight) {
			dx *= -1;
		}
		
		// this._magicEffectや_invocationEffectのmove呼び出しは、RealBattleによって行われる
		this._invocationEffect = this._realBattle.createEffect(anime, pos.x + dx, pos.y + 10, isRight, false);
	},
	
	_createMagicEffect: function() {
		var battler = this._realBattle.getPassiveBattler();
		var isRight = battler === this._realBattle.getBattler(true);
		var anime = this._getMagicAnime();
		var pos = battler.getEffectPos(anime);
		
		// 魔法を発動させる
		this._magicEffect = this._realBattle.createEffect(anime, pos.x, pos.y, isRight, true);
	},
	
	_getInvocationAnime: function() {
		return WeaponEffectControl.getAnime(this._unit, WeaponEffectAnime.MAGICINVOCATION);
	},
	
	_getMagicAnime: function() {
		var weapon = BattlerChecker.getRealBattleWeapon(this._realBattle.getActiveBattler().getUnit());
		
		return weapon.getMagicAnime();
	}
}
);

var MagicWeaponAttackBattler = defineObject(MagicBattler,
{
	_getMagicAnime: function() {
		return WeaponEffectControl.getAnime(this._unit, WeaponEffectAnime.MAGICWEAPON);
	}
}
);

// リアル戦闘時に表示されるエフェクトは、DynamicAnimeではなく、RealEffectを使用する
var RealEffect = defineObject(BaseObject,
{
	_motion: null,
	_isHitCheck: false,
	_realBattle: null,
	_isEasy: false,
	
	setupRealEffect: function(anime, x, y, isRight, realBattle) {
		var motionParam;
		
		this._realBattle = realBattle;
		
		if (anime === null) {
			return null;
		}
		
		motionParam = StructureBuilder.buildMotionParam();
		motionParam.animeData = anime;
		motionParam.x = x;
		motionParam.y = y;
		motionParam.isRight = isRight;
		motionParam.motionId = 0;
		
		this._motion = createObject(AnimeMotion);
		this._motion.setMotionParam(motionParam);
		
		return this._motion;
	},
	
	setHitCheck: function(isHitCheck) {
		this._isHitCheck = isHitCheck;
	},
	
	moveEffect: function() {
		if (this._motion.moveMotion() !== MoveResult.CONTINUE) {
			return MoveResult.CONTINUE;
		}
		
		if (this._motion.isAttackHitFrame() && this._isHitCheck) {
			this._realBattle.doHitAction();
		}
		
		this._motion.nextFrame();
		
		return MoveResult.CONTINUE;
	},
	
	drawEffect: function(xScroll, yScroll, isFront) {
		var anime;
		
		if (this._motion === null) {
			return;
		}
		
		if (this._isEasy) {
			this._motion.drawMotion(0, 0);
		}
		else {
			anime = this._motion.getAnimeData();
			if (isFront && !anime.isFrontDisplayable()) {
				return;
			}
			
			this._motion.drawMotion(xScroll, yScroll);
		}
	},
	
	endEffect: function() {
		this._motion = null;
	},
	
	isEffectLast: function() {
		if (this._motion === null) {
			return true;
		}
		
		return this._motion.isLastFrame();
	},
	
	getEffectX: function() {
		return this._motion.getKeyX();
	},
	
	getEffectY: function() {
		return this._motion.getKeyY();
	},
	
	getScreenEffectRangeType: function() {
		return this._motion.getScreenEffectRangeType();
	},
	
	drawScreenColor: function() {
		var color = this._motion.getScreenColor();
		var alpha = this._motion.getScreenAlpha();
		
		root.getGraphicsManager().fillRange(0, 0, root.getGameAreaWidth(), root.getGameAreaHeight(), color, alpha);
	},
	
	setEasyFlag: function(isEasy) {
		this._isEasy = isEasy;
	}
}
);

var RealAutoScroll = defineObject(BaseObject,
{
	_dx: 0,
	_xGoal: 0,
	_xScroll: 0,
	_isAutoStart: false,
	_isApproach: false,
	_counter: null,
	
	startScroll: function(xGoal) {
		var dx = this._getScrollPixel();
		
		this._counter = createObject(CycleCounter);
		this._counter.setCounterInfo(0);
		
		this._xGoal = this._calculateScrollValue(xGoal);
		if (this._xScroll < this._xGoal) {
			this._dx = dx;
		}
		else {
			this._dx = dx * -1;
		}
		
		this._isAutoStart = true;
	},
	
	moveAutoScroll: function() {
		var result = MoveResult.CONTINUE;
		
		if (!this._isAutoStart) {
			return MoveResult.END;
		}
		
		if (this._counter.moveCycleCounter() !== MoveResult.CONTINUE) {
			this._xScroll += this._dx;
			
			if (this._dx > 0) {
				// 右方向への自動スクロールである場合は、次の処理を調べる
				if (this._xScroll >= this._xGoal) {
					this._xScroll = this._xGoal;
					result = MoveResult.END;
				}
			}
			else {
				// 左方向への自動スクロールである場合は、次の処理を調べる
				if (this._xScroll <= this._xGoal) {
					this._xScroll = this._xGoal;
					result = MoveResult.END;
				}
			}
		}
		
		if (result === MoveResult.END) {
			this._isAutoStart = false;
		}
		
		return result;
	},
	
	setScrollX: function(x) {
		if (this._isAutoStart) {
			return;
		}
		
		// 既に接近済みの場合は、現在のスクロール値で固定される
		if (this._isApproach) {
			return;
		}
		
		this._xScroll = this._calculateScrollValue(x);
	},
	
	getScrollX: function() {
		if (root.getAnimePreference().isFixedFocus()) {
			return Math.floor((GraphicsFormat.BATTLEBACK_WIDTH - RealBattleArea.WIDTH) / 2);
		}
		else {
			return this._xScroll;
		}
	},
	
	isApproach: function() {
		if (root.getAnimePreference().isMoveMotionDisabled()) {
			// 移動モーションをスキップする場合は、常に接近しているものとみなす
			return true;
		}
		
		return this._isApproach;
	},
	
	setNear: function(isApproach) {
		this._isApproach = isApproach;
	},
	
	_calculateScrollValue: function(x) {
		var xScroll;
		var xBattleWidth = GraphicsFormat.BATTLEBACK_WIDTH;
		var xAreaWidth = RealBattleArea.WIDTH;
		var xCenter = Math.floor(xAreaWidth / 2);
		
		if (xAreaWidth > xBattleWidth) {
			return 0;
		}
		
		if (x - xCenter <= 0) {
			xScroll = 0;
		}
		else if (x + xCenter >= xBattleWidth) {
			xScroll = xBattleWidth - xAreaWidth;
		}
		else {
			xScroll = x - xCenter;
		}
		
		return xScroll;
	},
	
	_getScrollPixel: function() {
		return 15;
	}
}
);

var UIBattleLayout = defineObject(BaseObject,
{
	_realBattle: null,
	_battlerRight: null,
	_battlerLeft: null,
	_gaugeRight: null,
	_gaugeLeft: null,
	_itemRight: null,
	_itemLeft: null,
	_statusRight: null,
	_statusLeft: null,
	_scrollBackground: null,
	_isMoveEnd: false,
	_battleContainer: null,
	
	setBattlerAndParent: function (battlerRight, battlerLeft, realBattle) {
		var unit, targetUnit;
		
		this._realBattle = realBattle;
		this._battlerRight = battlerRight;
		this._battlerLeft = battlerLeft;

		this._gaugeRight = createObject(GaugeBar);
		this._gaugeLeft = createObject(GaugeBar);
		
		if (battlerRight.isSrc()) {
			unit = battlerRight.getUnit();
			targetUnit = battlerLeft.getUnit();
			
			this._gaugeRight.setGaugeInfo(unit.getHp(), ParamBonus.getMhp(unit), 1);
			this._gaugeLeft.setGaugeInfo(targetUnit.getHp(), ParamBonus.getMhp(targetUnit), 1);
			
			this._itemRight = BattlerChecker.getRealBattleWeapon(unit);
			this._itemLeft = BattlerChecker.getRealBattleWeapon(targetUnit);
		}
		else {
			unit = battlerLeft.getUnit();
			targetUnit = battlerRight.getUnit();
			
			this._gaugeRight.setGaugeInfo(targetUnit.getHp(), ParamBonus.getMhp(targetUnit), 1);
			this._gaugeLeft.setGaugeInfo(unit.getHp(), ParamBonus.getMhp(unit), 1);
			
			this._itemRight = BattlerChecker.getRealBattleWeapon(targetUnit);
			this._itemLeft = BattlerChecker.getRealBattleWeapon(unit);
		}
		
		this._gaugeLeft.setPartsCount(14);
		this._gaugeRight.setPartsCount(14);
		
		this._statusRight = this._getAttackStatus(unit, targetUnit, battlerRight.isSrc());
		this._statusLeft = this._getAttackStatus(unit, targetUnit, battlerLeft.isSrc());
		
		this._scrollBackground = createObject(ScrollBackground);
		
		this._createBattleContainer(realBattle);
		
		this._isMoveEnd = false;	
	},
	
	moveBattleLayout: function() {
		var isLastRight = this._gaugeRight.moveGaugeBar() !== MoveResult.CONTINUE;
		var isLastLeft = this._gaugeLeft.moveGaugeBar() !== MoveResult.CONTINUE;
		
		if (isLastRight && isLastLeft) {
			this._isMoveEnd = true;
		}
		else {
			this._isMoveEnd = false;
		}
		
		this._scrollBackground.moveScrollBackground();
				
		return MoveResult.CONTINUE;
	},
	
	drawBattleLayout: function() {
		this._battleContainer.pushBattleContainer();
		
		this._drawMain();
		
		this._battleContainer.popBattleContainer();
	},
	
	startBattleLayout: function() {
		if (root.getAnimePreference().isFixedFocus()) {
			this._scrollBackground.startScrollBackground(this._getBackgroundImage());
		}
		
		this._battleContainer.startBattleContainer();
	},
	
	endBattleLayout: function() {
		this._battleContainer.endBattleContainer();
	},
	
	isUIMoveLast: function() {
		return this._isMoveEnd;
	},
	
	setDamage: function(battler, damage, isCritical, isFinish) {
		var gauge;
		
		if (battler === this._battlerRight) {
			gauge = this._gaugeRight;
		}
		else {
			gauge = this._gaugeLeft;
		}
		
		if (damage >= 0) {
			gauge.startMove(damage * -1);
			this._showDamageAnime(battler, isCritical, isFinish);
		}
		else {
			// damageがマイナスである場合は、回復を行うべきことを意味する。
			// ただし、startMoveは常に正の数を要求するから-1かける。
			gauge.startMove(damage * -1);
			this._showRecoveryAnime(battler);
		}
	},
	
	showAvoidAnime: function(battler) {
		this._showAvoidAnime(battler);
	},
	
	_drawMain: function() {
		var battler;
		var rightUnit = this._battlerRight.getUnit();
		var leftUnit = this._battlerLeft.getUnit();
		var xScroll = this._realBattle.getAutoScroll().getScrollX();
		var yScroll = 0;
		
		this._drawBackground(xScroll, yScroll);
		
		this._drawColor(EffectRangeType.MAP);
		
		battler = this._realBattle.getActiveBattler();
		if (battler === this._battlerRight) {
			this._drawBattler(xScroll, yScroll, this._battlerLeft, true);
			this._drawColor(EffectRangeType.MAPANDCHAR);
			this._drawBattler(xScroll, yScroll, this._battlerRight, true);
		}
		else {
			this._drawBattler(xScroll, yScroll, this._battlerRight, true);
			this._drawColor(EffectRangeType.MAPANDCHAR);
			this._drawBattler(xScroll, yScroll, this._battlerLeft, true);
		}
		
		this._drawColor(EffectRangeType.ALL);
		
		this._drawEffect(xScroll, yScroll, false);
		
		this._drawFrame(true);
		this._drawFrame(false);
		
		this._drawNameArea(rightUnit, true);
		this._drawNameArea(leftUnit, false);
		
		this._drawWeaponArea(rightUnit, true);
		this._drawWeaponArea(leftUnit, false);
		
		this._drawFaceArea(rightUnit, true);
		this._drawFaceArea(leftUnit, false);
		
		this._drawInfoArea(rightUnit, true);
		this._drawInfoArea(leftUnit, false);
		
		this._drawHpArea(rightUnit, true);
		this._drawHpArea(leftUnit, false);
		
		this._drawEffect(xScroll, yScroll, true);
	},
	
	_drawBackground: function(xScroll, yScroll) {
		var pic;
		
		if (this._scrollBackground.isScrollable()) {
			this._scrollBackground.drawScrollBackground();
		}
		else {
			pic = this._getBackgroundImage();
			if (pic !== null) {
				pic.drawParts(0, 0, xScroll, yScroll, this._getBattleAreaWidth(), this._getBattleAreaHeight());
			}
			else {
				root.getGraphicsManager().fill(0x0);
			}
		}
	},
	
	_drawColor: function(rangeType) {
		var motion, battler;
		var effectArray = this._realBattle.getEffectArray();
		
		battler = this._realBattle.getActiveBattler();
		if (battler.getScreenEffectRangeType() === rangeType) {
			battler.drawScreenColor();
		}
		
		battler = this._realBattle.getPassiveBattler();
		if (battler.getScreenEffectRangeType() === rangeType) {
			battler.drawScreenColor();
		}
		
		if (effectArray.length > 0) {
			motion = effectArray[0];
			if (motion.getScreenEffectRangeType() === rangeType) {
				motion.drawScreenColor();
			}
		}
	},
	
	_drawFrame: function(isTop) {
		var x, y, graphicsHandle;
		var dx = this._getIntervalX();
		
		if (isTop) {
			this._drawLifeGadget(339 + dx, 0, this._battlerRight);
			this._drawLifeGadget(220 + dx, 0, this._battlerLeft);
			
			x = dx;
			y = 0;
			graphicsHandle = this._getTopGraphicsHandle();
		}
		else {
			x = dx;
			y = 367;
			graphicsHandle = this._getBottomGraphicsHandle();
		}
		
		if (graphicsHandle !== null) {
			GraphicsRenderer.drawImage(x, y, graphicsHandle, GraphicsType.PICTURE);
		}
	},
	
	_drawLifeGadget: function(x, y, battler) {
		var handle = root.queryGraphicsHandle('battlecrystal');
		var pic = GraphicsRenderer.getGraphics(handle, GraphicsType.PICTURE);
		var dx = 0;
		var type = battler.getUnit().getUnitType();
		
		if (type === UnitType.PLAYER) {
			dx = 0;
		}
		else if (type === UnitType.ENEMY) {
			dx = 84;
		}
		else {
			dx = 168;
		}
		
		if (pic !== null) {
			pic.drawStretchParts(x, y, 84, 84, dx, 0, 84, 84);
		}
	},
	
	_drawNameArea: function(unit, isRight) {
		var x, y, range;
		var text = unit.getName();
		var color = ColorValue.DEFAULT;
		var font = TextRenderer.getDefaultFont();
		var dx = this._getIntervalX();
		
		if (isRight) {
			x = 330 + dx;
			y = 385;
		}
		else {
			x = 115 + dx;
			y = 385;
		}
		
		range = createRangeObject(x, y, 185, 25);
		TextRenderer.drawRangeText(range, TextFormat.CENTER, text, -1, color, font);
	},
	
	_drawWeaponArea: function (unit, isRight) {
		var x, y, width, height, item, text;
		var color = ColorValue.DEFAULT;
		var font = TextRenderer.getDefaultFont();
		var dx = this._getIntervalX();
		
		if (isRight) {
			item = this._itemRight;
		}
		else {
			item = this._itemLeft;
		}
		
		if (item === null) {
			return;
		}
		
		text = item.getName();
		width = TextRenderer.getTextWidth(text, font) + GraphicsFormat.ICON_WIDTH;
		height = 25;
		
		if (isRight) {
			x = 330 + dx;
			y = 417;
			
		}
		else {
			x = 115 + dx;
			y = 417;
		}
		
		x += (185 - width) / 2;
		y = Math.floor((y + (y + height)) / 2);
		
		if (item !== null) {
			ItemRenderer.drawItem(x, y, item, color, font, false);
		}
	},
	
	_drawFaceArea: function(unit, isRight) {
		var x, y;
		var dx = 20 + this._getIntervalX();
		var isReverse = false;
		
		if (isRight) {
			x = this._getBattleAreaWidth() - GraphicsFormat.FACE_WIDTH - dx;
		}
		else {
			x = 0 + dx;
			isReverse = true;
		}
		
		y = (0 + this._getBattleAreaHeight()) - GraphicsFormat.FACE_HEIGHT - 15;
		
		ContentRenderer.drawUnitFace(x, y, unit, isReverse, 255);
	},
	
	_drawInfoArea: function(unit, isRight) {
		var x, y, arr;
		var dx = 10 + this._getIntervalX();
		var color = ColorValue.KEYWORD;
		var font = TextRenderer.getDefaultFont();
		
		if (isRight) {
			x = this._getBattleAreaWidth() - 205 - dx;
			arr = this._statusRight;
		}
		else {
			x = dx;
			arr = this._statusLeft;
		}
		
		y = 65;
		StatusRenderer.drawAttackStatus(x, y, arr, color, font, 15);
	},
	
	_drawHpArea: function(unit, isRight) {
		var x, gauge, hp, xNumber, yNumber;
		var y = 40;
		var dx = 70 + this._getIntervalX();
		var dyNumber = 12;
		var pic = root.queryUI('battle_gauge');
		
		if (isRight) {
			x = this._getBattleAreaWidth() - this._gaugeRight.getGaugeWidth() - dx;
			gauge = this._gaugeRight;
			hp = this._gaugeRight.getBalancer().getCurrentValue();
			
			xNumber = 380 + this._getIntervalX();
			yNumber = y - dyNumber;
			
		}
		else {
			x = dx;
			gauge = this._gaugeLeft;
			hp = this._gaugeLeft.getBalancer().getCurrentValue();
			
			xNumber = 260 + this._getIntervalX();
			yNumber = y - dyNumber;
		}
		
		gauge.drawGaugeBar(x, y, pic);
		
		NumberRenderer.drawAttackNumberCenter(xNumber, yNumber, hp);
	},
	
	_drawBattler: function(xScroll, yScroll, battler, isRight) {
		battler.drawBattler(xScroll, yScroll);
	},
	
	_drawEffect: function(xScroll, yScroll, isFront) {
		var i, effect;
		var effectArray = this._realBattle.getEffectArray();
		var count = effectArray.length;
		
		for (i = 0; i < count; i++) {
			effect = effectArray[i];
			effect.drawEffect(xScroll, yScroll, isFront);
		}
	},
	
	_getIntervalX: function() {
		return Math.floor((RealBattleArea.WIDTH - 640) / 2);
	},
	
	_getAttackStatus: function(unit, targetUnit, isSrc) {
		var arr, isCounterattack;
		
		if (isSrc) {
			arr = AttackChecker.getAttackStatusInternal(unit, BattlerChecker.getRealBattleWeapon(unit), targetUnit);
		}
		else {
			isCounterattack = this._realBattle.getAttackInfo().isCounterattack;
			if (isCounterattack) {
				arr = AttackChecker.getAttackStatusInternal(targetUnit, BattlerChecker.getRealBattleWeapon(targetUnit), unit);
			}
			else {
				arr = AttackChecker.getNonStatus();
			}
		}
		
		return arr;
	},
	
	_showDamageAnime: function(battler, isCritical, isFinish) {
		var pos;
		var anime = null;
		var isRight = battler === this._realBattle.getBattler(true);
		
		if (this._realBattle.getAttackOrder().getPassiveDamage() === 0) {
			anime = root.queryAnime('realnodamage');
		}
		
		if (anime === null) {
			anime = WeaponEffectControl.getDamageAnime(this._realBattle.getActiveBattler().getUnit(), isCritical, true);
		}
		
		if (anime === null) {
			return;
		}
		
		pos = battler.getEffectPos(anime);
		this._realBattle.createEffect(anime, pos.x, pos.y, isRight, false);
	},
	
	_showRecoveryAnime: function(battler) {
		var anime = root.queryAnime('realrecovery');
		var pos = battler.getEffectPos(anime);
		var isRight = battler === this._realBattle.getBattler(true);
		
		this._realBattle.createEffect(anime, pos.x, pos.y, isRight, false);
	},
	
	_showAvoidAnime: function(battler) {
		var anime = root.queryAnime('realavoid');
		var pos = battler.getEffectPos(anime);
		var isRight = battler === this._realBattle.getBattler(true);
		
		this._realBattle.createEffect(anime, pos.x, pos.y, isRight, false);
	},
	
	_getLifeGadget: function(battler) {
		var gadget;
		var type = battler.getUnit().getUnitType();
		
		if (type === UnitType.PLAYER) {
			gadget = root.queryUI('battleplayer_gadget');
		}
		else if (type === UnitType.ENEMY) {
			gadget = root.queryUI('battleenemy_gadget');
		}
		else {
			gadget = root.queryUI('battlepartner_gadget');
		}
		
		return gadget;
	},
	
	_getBackgroundImage: function() {
		var mapInfo = root.getCurrentSession().getCurrentMapInfo();
		var pic = mapInfo.getFixedBackgroundImage();
		
		if (pic === null) {
			pic = this._realBattle.getAttackInfo().picBackground;
		}
		
		return pic;
	},
	
	_getBattleAreaWidth: function() {
		return this._realBattle.getBattleArea().width;
	},
	
	_getBattleAreaHeight: function() {
		return this._realBattle.getBattleArea().height;
	},
	
	_getTopGraphicsHandle: function() {
		return root.queryGraphicsHandle('battletop');
	},
	
	_getBottomGraphicsHandle: function() {
		return root.queryGraphicsHandle('battlebottom');
	},
	
	_createBattleContainer: function(realBattle) {
		if (DataConfig.isHighResolution()) {
			if (EnvironmentControl.isRealBattleScaling()) {
				this._battleContainer = createObject(ScalingBattleContainer);
			}
			else {
				this._battleContainer = createObject(ClipingBattleContainer);
			}
		}
		else {
			this._battleContainer = createObject(BaseBattleContainer);
		}
		
		this._battleContainer.setBattleObject(realBattle);
	}
}
);

var BaseBattleContainer = defineObject(BaseObject,
{
	_realBattle: null,
	
	setBattleObject: function(realBattle) {
		this._realBattle = realBattle;
	},
	
	startBattleContainer: function() {
	},
	
	pushBattleContainer: function() {
	},
	
	popBattleContainer: function() {
	},
	
	endBattleContainer: function() {
	},
	
	_getBattleAreaWidth: function() {
		return this._realBattle.getBattleArea().width;
	},
	
	_getBattleAreaHeight: function() {
		return this._realBattle.getBattleArea().height;
	}
}
);

var ClipingBattleContainer = defineObject(BaseBattleContainer,
{
	_battleClippingArea: null,
	_safeClipping: null,
	
	startBattleContainer: function() {
		var x = (root.getGameAreaWidth() - this._getBattleAreaWidth()) / 2;
		var y = (root.getGameAreaHeight() - this._getBattleAreaHeight()) / 2;
		
		this._realBattle.getBattleArea().x = x;
		this._realBattle.getBattleArea().y = y;
		
		if (x > 0 || y > 0) {
			x += root.getViewportX();
			y += root.getViewportY();
			this._battleClippingArea = root.getGraphicsManager().createClippingArea(x, y, this._getBattleAreaWidth(), this._getBattleAreaHeight());
			
			this._safeClipping = createObject(SafeClipping);
			
			this._changeMapState(false);
		}
	},
	
	pushBattleContainer: function() {
		var x = LayoutControl.getCenterX(-1, this._getBattleAreaWidth());
		var y = LayoutControl.getCenterY(-1, this._getBattleAreaHeight());
		
		if (x > 0 || y > 0) {
			root.getGraphicsManager().fillRange(0, 0, root.getGameAreaWidth(), root.getGameAreaHeight(), 0, 128);
			
			// 描画の基準位置が原点(0, 0)ではなく、x, yになる
			this._safeClipping.saveClipping(this._battleClippingArea);
		}
	},
	
	popBattleContainer: function() {
		var x = LayoutControl.getCenterX(-1, this._getBattleAreaWidth());
		var y = LayoutControl.getCenterY(-1, this._getBattleAreaHeight());
		
		if (x > 0 || y > 0) {
			this._safeClipping.restoreClipping();
		}
	},
	
	endBattleContainer: function() {
		var x = LayoutControl.getCenterX(-1, this._getBattleAreaWidth());
		var y = LayoutControl.getCenterY(-1, this._getBattleAreaHeight());
		
		if (x > 0 || y > 0) {
			this._changeMapState(true);
		}
	},
	
	_changeMapState: function(isEnabled) {
		// マップが描画されることになるが、アニメーションは無効にする
		root.getCurrentSession().setMapState(MapStateType.ANIMEUNIT, isEnabled);
		root.getCurrentSession().setMapState(MapStateType.ANIMEMAP, isEnabled);
	}
}
);

var ScalingBattleContainer = defineObject(BaseBattleContainer,
{
	_picCache: null,
	
	startBattleContainer: function() {
		this._picCache = root.getGraphicsManager().createCacheGraphics(this._getBattleAreaWidth(), this._getBattleAreaHeight());
		this._changeMapState(false);
	},
	
	pushBattleContainer: function() {
		root.getGraphicsManager().enableMapClipping(false);
		
		root.getGraphicsManager().setRenderCache(this._picCache);
	},
	
	popBattleContainer: function() {
		root.getGraphicsManager().resetRenderCache();
		this._picCache.drawStretchParts(0, 0, root.getGameAreaWidth(), root.getGameAreaHeight(), 0, 0, this._getBattleAreaWidth(), this._getBattleAreaHeight());
		
		root.getGraphicsManager().enableMapClipping(true);
	},
	
	endBattleContainer: function() {
		this._changeMapState(true);
	},
	
	_changeMapState: function(isEnabled) {
		// 戦闘背景がGameAreaを完全に覆い隠し、マップが描画される必要がないから、
		// マップの描画とユニットの描画を無効にする。
		root.getCurrentSession().setMapState(MapStateType.DRAWUNIT, isEnabled);
		root.getCurrentSession().setMapState(MapStateType.DRAWMAP, isEnabled);
	}
}
);
