
var PreAttackMode = {
	START: 0,
	CORE: 1,
	END: 2
};

// リアル形式の通常戦闘の流れは、次のようになる。

// PreAttack.normalAttack
// 戦闘を発生させたい場合に呼び出す。
// 呼び出し元は、normalAttackの後にmovePreAttackCycleを呼び出すことになり、
// これがMoveResult.ENDを返すと戦闘が終わったことになる。
// ↓
// PreAttack._startStraightFlow
// 戦闘画面に入る前の処理を行う。
// 既定では何も行っていないが、この時点ではまだ画面が切り替わっていないため、
// マップ上で何らかの表示を行うために活用できる。
// ↓
// CoerAttack.normalAttack
// 戦闘に必要な情報を作成する。
// NormalAttackInfoBuilder.createAttackInfoをAttackInfoを作成し、
// NormalAttackOrderBuilder.createAttackOrderでAttackOrderを作成する。
// ↓
// CoerAttack.enterCoreAttackCyce
// CoreAttackは現在の戦闘形式に応じて、適切なメソッドを呼び出す仲介であり、
// リアル形式の戦闘ならば、RealBattle.enterBattleCycleが呼ばれ、
// 簡易形式の戦闘ならばEasyBattle.enterBattleCycleが呼ばれる要領になる。
// ↓
// AttackFlow._startStraightFlow
// 戦闘画面に入り、実際に戦闘を開始する前の処理を行う。
// 既定では、ユニットが会話する処理が行われている。
// ↓
// CoerAttack.moveCoreAttackCyce/drawCoreAttackCycle
// 戦闘が終了するまで繰り返し呼ばれる。
// ↓
// AttackFlow._endStraightFlow
// 戦闘画面にて戦闘が終了した場合の処理を行う。
// 既定では、ユニットが死亡した場合の台詞や、
// 経験値を取得する処理が行われている。
// ↓
// PreAttack._endStraightFlow
// 戦闘が終了し、画面がマップに切り替わった後の処理を行う。
// 既定では、ドロップトロフィーの取得や、重要アイテムをストックに送る処理が行われている。
// これらの処理は、AttackFlow._endStraightFlowに含めてもよいように思えるが、
// AttackFlowにはスキップ可能な処理しか含めてはならないことになっているため、
// PreAttackで行うようにしている。
// たとえば、ドロップトロフィーの取得をする際にアイテムが一杯である場合は、スキップを停止せざる得ない。

var PreAttack = defineObject(BaseObject,
{
	_attackParam: null,
	_coreAttack: null,
	_startStraightFlow: null,
	_endStraightFlow: null,
	
	enterPreAttackCycle: function(attackParam) {
		this._prepareMemberData(attackParam);
		return this._completeMemberData(attackParam);
	},
	
	movePreAttackCycle: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === PreAttackMode.START) {
			result = this._moveStart();
		}
		else if (mode === PreAttackMode.CORE) {
			result = this._moveCore();
		}
		else if (mode === PreAttackMode.END) {
			result = this._moveEnd();
		}
		
		return result;
	},
	
	drawPreAttackCycle: function() {
		var mode = this.getCycleMode();
		
		if (mode === PreAttackMode.START) {
			this._drawStart();
		}
		else if (mode === PreAttackMode.CORE) {
			this._drawCore();
		}
		else if (mode === PreAttackMode.END) {
			this._drawEnd();
		}
	},
	
	backPreAttackCycle: function() {
		var mode = this.getCycleMode();
		
		if (mode === PreAttackMode.CORE) {
			this._coreAttack.backCoreAttackCycle();
		}
	},
	
	getActiveUnit: function() {
		var order = this._coreAttack.getAttackFlow().getAttackOrder();
		
		return order.getActiveUnit();
	},
	
	getPassiveUnit: function() {
		var order = this._coreAttack.getAttackFlow().getAttackOrder();
		
		return order.getPassiveUnit();
	},
	
	isUnitLostEventShown: function() {
		return this._coreAttack.isUnitLostEventShown();
	},
	
	recordUnitLostEvent: function(isShown) {
		this._coreAttack.recordUnitLostEvent(isShown);
	},
	
	isPosMenuDraw: function() {
		return this.getCycleMode() === PreAttackMode.START;
	},
	
	getCoreAttack: function() {
		return this._coreAttack;
	},
	
	_prepareMemberData: function(attackParam) {
		this._attackParam = attackParam;
		this._coreAttack = createObject(CoreAttack);
		this._startStraightFlow = createObject(StraightFlow);
		this._endStraightFlow = createObject(StraightFlow);
		
		CurrentMap.setPreAttackObject(this);
	},
	
	_completeMemberData: function(attackParam) {
		this._doStartAction();
		
		if (CurrentMap.isCompleteSkipMode()) {
			if (this._skipAttack()) {
				this._doEndAction();
				return EnterResult.NOTENTER;
			}
		}
		else {
			this._startStraightFlow.enterStraightFlow();
			this.changeCycleMode(PreAttackMode.START);
		}
		
		return EnterResult.OK;
	},
	
	_moveStart: function() {
		if (this._startStraightFlow.moveStraightFlow() !== MoveResult.CONTINUE) {
			this._coreAttack.enterCoreAttackCycle(this._attackParam, false);
			this.changeCycleMode(PreAttackMode.CORE);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveCore: function() {
		if (this._coreAttack.moveCoreAttackCycle() !== MoveResult.CONTINUE) {
			this._endStraightFlow.enterStraightFlow();
			this.changeCycleMode(PreAttackMode.END);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveEnd: function() {
		if (this._endStraightFlow.moveStraightFlow() !== MoveResult.CONTINUE) {
			this._doEndAction();
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	_drawStart: function() {
		this._startStraightFlow.drawStraightFlow();
	},
	
	_drawCore: function() {
		this._coreAttack.drawCoreAttackCycle();
	},
	
	_drawEnd: function() {
		this._endStraightFlow.drawStraightFlow();
	},
	
	_skipAttack: function() {
		// 完全に処理をスキップできなかった場合はfalseを返す。
		// falseを検出した呼び出し元は、movePreAttackCycle/drawPreAttackCycleを呼び出すモードに切り替える。
		
		if (this._startStraightFlow.enterStraightFlow() === EnterResult.OK) {
			this.changeCycleMode(PreAttackMode.START);
			return false;
		}
		
		// これは完全にスキップできる
		// すなわち、メソッドが制御を返した時には、戦闘は終えている
		this._coreAttack.enterCoreAttackCycle(this._attackParam);
		
		if (this._endStraightFlow.enterStraightFlow() === EnterResult.OK) {
			this.changeCycleMode(PreAttackMode.END);
			// このモードで処理を再開できるように
			return false;
		}
		
		return true;
	},
	
	_doStartAction: function() {
		this._startStraightFlow.setStraightFlowData(this);
		this._pushFlowEntriesStart(this._startStraightFlow);
		
		this._endStraightFlow.setStraightFlowData(this);
		this._pushFlowEntriesEnd(this._endStraightFlow);
		
		if (this._attackParam.fusionAttackData !== null) {
			FusionControl.startFusionAttack(this._attackParam.unit, this._attackParam.fusionAttackData);
		}
	},
	
	_doEndAction: function() {
		if (this._attackParam.fusionAttackData !== null) {
			FusionControl.endFusionAttack(this._attackParam.unit);
		}
		
		CurrentMap.setPreAttackObject(null);
	},
	
	_pushFlowEntriesStart: function(straightFlow) {
	},
	
	_pushFlowEntriesEnd: function(straightFlow) {
		// LoserMessageFlowEntryは死亡時イベントを確認する。
		// この確認はCoreAttackのUnitDeathFlowEntryでも行われるが、
		// CoreAttackの確認はスキップ可能であるため、
		// ユニットが死亡しても何も表示されないということが起こり得る。
		// これを防ぐためにLoserMessageFlowEntryを用意している。
		straightFlow.pushFlowEntry(LoserMessageFlowEntry);
		
		// WeaponValidFlowEntryは、DropFlowEntryより先行すること
		straightFlow.pushFlowEntry(WeaponValidFlowEntry);
		straightFlow.pushFlowEntry(DropFlowEntry);
		straightFlow.pushFlowEntry(ImportantItemFlowEntry);
		straightFlow.pushFlowEntry(ReleaseFusionFlowEntry);
		straightFlow.pushFlowEntry(CatchFusionFlowEntry);
	}
}
);

var LoserMessageFlowEntry = defineObject(BaseFlowEntry,
{
	_capsuleEvent: null,
	
	enterFlowEntry: function(preAttack) {
		this._prepareMemberData(preAttack);
		return this._completeMemberData(preAttack);
	},
	
	moveFlowEntry: function() {
		var result = MoveResult.CONTINUE;
		
		if (this._capsuleEvent.moveCapsuleEvent() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return result;
	},
	
	_prepareMemberData: function(preAttack) {
		this._capsuleEvent = createObject(CapsuleEvent);
	},
	
	_completeMemberData: function(preAttack) {
		var result;
		var unit = preAttack.getPassiveUnit();
		
		if (unit.getHp() !== 0) {
			return EnterResult.NOTENTER;
		}
		
		// 既に死亡イベントが表示されている場合は直ちに終了する
		if (preAttack.isUnitLostEventShown()) {
			return EnterResult.NOTENTER;
		}
		
		result = this._capsuleEvent.enterCapsuleEvent(UnitEventChecker.getUnitLostEvent(unit), false);
		if (result !== EnterResult.NOTENTER) {
			// 死亡イベントを表示するため、スキップを無効にする
			CurrentMap.setTurnSkipMode(false);
		}
		
		return result;
	}
}
);

var WeaponValidFlowEntry = defineObject(BaseFlowEntry,
{
	enterFlowEntry: function(preAttack) {
		this._checkDelete(preAttack.getActiveUnit());
		this._checkDelete(preAttack.getPassiveUnit());
		
		return EnterResult.NOTENTER;
	},
	
	_checkDelete: function(unit) {
		var weapon = ItemControl.getEquippedWeapon(unit);
		
		if (weapon === null) {
			return;
		}
		
		if (ItemControl.isItemBroken(weapon)) {
			ItemControl.lostItem(unit, weapon);
		
			if (unit.getUnitType() !== UnitType.PLAYER && DataConfig.isDropTrophyLinked()) {
				// 武器が壊れたため、ドロップトロフィーを消失させる
				ItemControl.deleteTrophy(unit, weapon);
			}
		}
	}
}
);

var DropFlowEntry = defineObject(BaseFlowEntry,
{
	_trophyCollector: null,
	
	enterFlowEntry: function(preAttack) {
		this._prepareMemberData(preAttack);
		return this._completeMemberData(preAttack);
	},
	
	moveFlowEntry: function() {
		return this._trophyCollector.moveTrophyCollector();
	},
	
	_prepareMemberData: function(preAttack) {
		this._trophyCollector = createObject(TrophyCollector);
	},
	
	_completeMemberData: function(preAttack) {
		var result;
		var active = preAttack.getActiveUnit();
		var passive = preAttack.getPassiveUnit();
		
		if (active !== null) {
			if (!this._isDrop(preAttack)) {
				return EnterResult.NOTENTER;
			}
		}
		
		this._startTrophyCheck(active, passive);
		result = this._enterTrophyCollector(active, passive);
		this._endTrophyCheck(active, passive);
		
		return result;
	},
	
	_isDrop: function(preAttack) {
		var winner;
		var active = preAttack.getActiveUnit();
		var passive = preAttack.getPassiveUnit();
		
		if (active.getHp() !== 0 && passive.getHp() !== 0) {
			return false;
		}
		
		if (passive.getHp() === 0) {
			winner = active;
		}
		else {
			winner = passive;
		}
		
		// 勝者が敵である場合はドロップチェックをしない
		if (winner.getUnitType() === UnitType.ENEMY || winner.getUnitType() === UnitType.ALLY) {
			return false;
		}
		
		return true;
	},
	
	_startTrophyCheck: function(winner, loser) {
		var i, item;
		var count = UnitItemControl.getPossessionItemCount(loser);
		
		if (!DamageControl.isSyncope(loser)) {
			return;
		}
		
		// キャッチ後の交換でアイテムを入手できるため、
		// 所持アイテムとリンクするドロップトロフィーを削除する。
		for (i = 0; i < count; i++) {
			item = UnitItemControl.getItem(loser, i);
			if (item === null) {
				continue;
			}
			
			ItemControl.deleteTrophy(loser, item);
		}
	},
	
	_enterTrophyCollector: function(winner, loser) {
		var i, trophy;
		var list = loser.getDropTrophyList();
		var count = list.getCount();
		
		this._trophyCollector.prepareTrophy(winner);
		
		// ドロップトロフィーをTrophyCollectorに設定
		for (i = 0; i < count; i++) {
			trophy = list.getData(i);
			if ((trophy.getFlag() & TrophyFlag.ITEM) && DataConfig.isDropTrophyLinked()) {
				// 「武器破損時にドロップトロフィーを削除する」がチェックされている場合は、
				// 武器の耐久がドロップトロフィーに影響する。
				this._copyItemLimit(loser, trophy);
			}
			this._trophyCollector.addTrophy(trophy);
		}
		
		return this._trophyCollector.enterTrophyCollector();
	},
	
	_copyItemLimit: function(loser, trophy) {
		var i, item;
		var count = UnitItemControl.getPossessionItemCount(loser);
		
		for (i = 0; i < count; i++) {
			item = UnitItemControl.getItem(loser, i);
			if (item === null) {
				continue;
			}
			
			if (ItemControl.compareItem(item, trophy.getItem())) {
				// itemの耐久を受け継ぐため、ドロップトロフィーは新品の状態で入手できるわけではなくなる
				trophy.setLimit(item.getLimit());
				break;
			}
		}
	},
	
	_endTrophyCheck: function(winner, loser) {
		var list = loser.getDropTrophyList();
		var editor = root.getCurrentSession().getTrophyEditor();
		
		editor.deleteAllTrophy(list);
	}
}
);

var ImportantItemFlowEntry = defineObject(BaseFlowEntry,
{
	_dynamicEvent: null,
	
	enterFlowEntry: function(preAttack) {
		this._prepareMemberData(preAttack);
		return this._completeMemberData(preAttack);
	},
	
	moveFlowEntry: function() {
		return this._dynamicEvent.moveDynamicEvent();
	},
	
	_prepareMemberData: function(preAttack) {
		this._dynamicEvent = createObject(DynamicEvent);
	},
	
	_completeMemberData: function(preAttack) {
		var generator;
		var unit = preAttack.getPassiveUnit();
		
		// 自軍でない場合は、重要アイテムの確認は不要
		if (unit.getUnitType() !== UnitType.PLAYER) {
			return EnterResult.NOTENTER;
		}
		
		// HPだけでなく、死亡状態かどうかも調べる。
		// 負傷の場合は重要アイテムを送らない。
		if (unit.getHp() !== 0 || unit.getAliveState() !== AliveType.DEATH) {
			return EnterResult.NOTENTER;
		}
		
		generator = this._dynamicEvent.acquireEventGenerator();
		
		if (!this._checkImportantItem(unit, generator)) {
			return EnterResult.NOTENTER;
		}
		
		return this._dynamicEvent.executeDynamicEvent();
	},
	
	_checkImportantItem: function(unit, generator) {
		var i, item;
		var count = UnitItemControl.getPossessionItemCount(unit);
		var isDataAdd = false;
		var isSkipMode = true;
		
		// 自軍ユニットが死亡する場合は、ユニットが重要アイテムを持っているかを確認する。
		// 理由は、重要アイテムを失うとゲームがクリアできない可能性が生じるためである。
		// よって、重要アイテムを持っていた場合は、ストックに追加するようにする。
		for (i = 0; i < count; i++) {
			item = UnitItemControl.getItem(unit, i);
			// アイテムが重要アイテムかを調べる
			if (item !== null && item.isImportance()) {
				// 交換禁止でない場合のみストックに送る。
				// そうでなければ、ストックに送られたアイテムを通じて交換が成立する。
				if (!item.isTradeDisabled()) {
					isDataAdd = true;
					generator.stockItemChange(item, IncreaseType.INCREASE, isSkipMode);
					generator.unitItemChange(unit, item, IncreaseType.DECREASE, isSkipMode);
				}
			}
		}
		
		return isDataAdd;
	}
}
);

// 「フュージョン攻撃」で敵を撃破した場合は、そのユニットをキャッチする
var CatchFusionFlowEntry = defineObject(BaseFlowEntry,
{
	_dynamicEvent: null,
	
	enterFlowEntry: function(preAttack) {
		this._prepareMemberData(preAttack);
		return this._completeMemberData(preAttack);
	},
	
	moveFlowEntry: function() {
		if (this._dynamicEvent.moveDynamicEvent() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	_prepareMemberData: function(preAttack) {
		this._dynamicEvent = createObject(DynamicEvent);
	},
	
	_completeMemberData: function(preAttack) {
		var generator;
		var active = preAttack.getActiveUnit();
		var passive = preAttack.getPassiveUnit();
		var fusionData = FusionControl.getFusionAttackData(active);
		var direction = PosChecker.getSideDirection(active.getMapX(), active.getMapY(), passive.getMapX(), passive.getMapY());
		
		if (fusionData === null) {
			return EnterResult.NOTENTER;
		}
		
		if (!DamageControl.isSyncope(passive)) {
			return EnterResult.NOTENTER;
		}
		
		DamageControl.setCatchState(passive, true);
		
		generator = this._dynamicEvent.acquireEventGenerator();
		generator.unitFusion(active, passive, fusionData, direction, FusionActionType.CATCH, false);
		
		return this._dynamicEvent.executeDynamicEvent();
	}
}
);

// フュージョンの親ユニットが戦闘不能になった場合は、子ユニットを開放する
var ReleaseFusionFlowEntry = defineObject(BaseFlowEntry,
{
	_dynamicEvent: null,
	
	enterFlowEntry: function(preAttack) {
		this._prepareMemberData(preAttack);
		return this._completeMemberData(preAttack);
	},
	
	moveFlowEntry: function() {
		if (this._dynamicEvent.moveDynamicEvent() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	_prepareMemberData: function(preAttack) {
		this._dynamicEvent = createObject(DynamicEvent);
	},
	
	_completeMemberData: function(preAttack) {
		var generator, parentUnit, childUnit;
		var unit = preAttack.getPassiveUnit();
		
		if (unit.getHp() !== 0) {
			return EnterResult.NOTENTER;
		}
		
		parentUnit = FusionControl.getFusionParent(unit);
		if (parentUnit !== null) {
			// unitはフュージョンされているため、親から切り離す
			FusionControl.releaseChild(parentUnit);
			return EnterResult.NOTENTER;
		}
		
		// unitがフュージョンしていないため、処理を続行しない
		childUnit = FusionControl.getFusionChild(unit);
		if (childUnit === null) {
			return EnterResult.NOTENTER;
		}
		
		// 「フュージョン攻撃」でキャッチされたユニットが通常になる
		childUnit.setSyncope(false);
		
		generator = this._dynamicEvent.acquireEventGenerator();
		generator.unitFusion(unit, {}, {}, DirectionType.NULL, FusionActionType.RELEASE, false);
		
		return this._dynamicEvent.executeDynamicEvent();
	}
}
);

// イベントコマンドの「ダメージを与える」でユニットが倒れた場合の処理を行う。
// イベントコマンドの「ユニットの消去」では、こうした処理は発生しない。
var DamageHitFlow = defineObject(BaseObject,
{
	_unit: null,
	_targetUnit: null,
	_straightFlow: null,
	
	enterDamageHitFlowCycle: function(unit, targetUnit) {
		this._unit = unit;
		this._targetUnit = targetUnit;
		this._straightFlow = createObject(StraightFlow);
		this._straightFlow.setStraightFlowData(this);
		this._pushFlowEntries(this._straightFlow);
		
		return this._straightFlow.enterStraightFlow();
	},
	
	moveDamageHitFlowCycle: function() {
		return this._straightFlow.moveStraightFlow();
	},
	
	drawDamageHitFlowCycle: function() {
		this._straightFlow.drawStraightFlow();
	},
	
	// 各種FlowEntryはPreAttackを受け取る設計であるため、
	// PreAttackのメソッドを実装する。
	getActiveUnit: function() {
		return this._unit;
	},
	
	getPassiveUnit: function() {
		return this._targetUnit;
	},
	
	isUnitLostEventShown: function() {
		return false;
	},
	
	recordUnitLostEvent: function(isShown) {
	},
	
	_pushFlowEntries: function(straightFlow) {
		// 武器による撃破ではないため、WeaponValidFlowEntryを含まない
		
		straightFlow.pushFlowEntry(LoserMessageFlowEntry);
		straightFlow.pushFlowEntry(DropFlowEntry);
		straightFlow.pushFlowEntry(ImportantItemFlowEntry);
		straightFlow.pushFlowEntry(ReleaseFusionFlowEntry);
	}
}
);
