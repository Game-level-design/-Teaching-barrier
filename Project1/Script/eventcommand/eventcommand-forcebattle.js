
var ForceBattleMode = {
	LIGHT: 0,
	BATTLE: 1
};

var ForceBattleEventCommand = defineObject(BaseEventCommand,
{
	_obj: null,
	_unitSrc: null,
	_unitDest: null,
	_fusionData: null,
	_isBattleOnly: false,
	_preAttack: null,
	_lockonCursor: null,
	
	enterEventCommandCycle: function() {
		this._prepareEventCommandMemberData();
		
		if (!this._checkEventCommand()) {
			return EnterResult.NOTENTER;
		}
		
		return this._completeEventCommandMemberData();
	},
	
	moveEventCommandCycle: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === ForceBattleMode.LIGHT) {
			result = this._moveLight();
		}
		else if (mode === ForceBattleMode.BATTLE) {
			result = this._moveBattle();
		}
		
		return result;
	},
	
	drawEventCommandCycle: function() {
		var mode = this.getCycleMode();
		
		if (mode === ForceBattleMode.LIGHT) {
			this._drawLight();
		}
		else if (mode === ForceBattleMode.BATTLE) {
			this._drawBattle();
		}
	},
	
	backEventCommandCycle: function() {
		var mode = this.getCycleMode();
		
		if (mode === ForceBattleMode.BATTLE) {
			this._preAttack.backPreAttackCycle();
		}
	},
	
	isEventCommandSkipAllowed: function() {
		// 戦闘のスキップ検出は、CoreAttackで行っているため、ここでは許可しない
		return false;
	},
	
	_prepareEventCommandMemberData: function() {
		var eventCommandData = root.getEventCommandObject();
		
		this._obj = eventCommandData;
		this._unitSrc = eventCommandData.getForceSrc();
		this._unitDest = eventCommandData.getForceDest();
		this._fusionData = eventCommandData.getFusionData();
		this._isBattleOnly = false;
		this._preAttack = createObject(PreAttack);
		this._lockonCursor = createObject(LockonCursor);
	},
	
	_checkEventCommand: function() {
		var attackParam, result;
		
		if (!this._isAttackAllowed(this._unitSrc, this._unitDest)) {
			return false;
		}
		
		// 戦闘に入る前に、既に表示されているかもしれないメッセージを消去する
		EventCommandManager.eraseMessage(MessageEraseFlag.ALL);
		
		if (this.isSystemSkipMode()) {
			attackParam = this._createAttackParam();
			result = this._preAttack.enterPreAttackCycle(attackParam);
			if (result === EnterResult.NOTENTER) {
				// スキップの戦闘が問題なく終わった場合は、cycleに入らないようにfalseを返す
				return false;
			}
			else {
				this._isBattleOnly = true;
			}
		}
		
		return true;
	},
	
	_completeEventCommandMemberData: function() {
		if (this._isBattleOnly) {
			this.changeCycleMode(ForceBattleMode.BATTLE);
		}
		else {
			this._lockonCursor.setPos(this._unitDest.getMapX(), this._unitDest.getMapY());
			this.changeCycleMode(ForceBattleMode.LIGHT);
		}
		
		return EnterResult.OK;
	},
	
	_createAttackParam: function() {
		var attackParam = StructureBuilder.buildAttackParam();
		
		attackParam.unit = this._unitSrc;
		attackParam.targetUnit = this._unitDest;
		attackParam.attackStartType = AttackStartType.FORCE;
		attackParam.forceBattleObject = this._obj;
		
		if (this._fusionData !== null && this._fusionData.getFusionType() === FusionType.ATTACK) {
			attackParam.fusionAttackData = this._fusionData;
		}
		
		return attackParam;
	},
	
	_moveLight: function() {
		var attackParam, result;
		
		if (this.isSystemSkipMode() || this._lockonCursor.moveCursor() !== MoveResult.CONTINUE) {
			this._lockonCursor.endCursor();
			
			attackParam = this._createAttackParam();
			result = this._preAttack.enterPreAttackCycle(attackParam);
			if (result === EnterResult.NOTENTER) {
				return MoveResult.END;
			}
			
			this.changeCycleMode(ForceBattleMode.BATTLE);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveBattle: function() {
		return this._preAttack.movePreAttackCycle();
	},
	
	_drawLight: function() {
		this._lockonCursor.drawCursor();
	},
	
	_drawBattle: function() {
		this._preAttack.drawPreAttackCycle();
	},
	
	_isAttackAllowed: function(unitSrc, unitDest) {
		if (unitSrc === null || unitDest === null) {
			return false;
		}
		
		// 攻撃をしかける者がアイテムを装備していない場合は、戦闘を開始しない
		if (ItemControl.getEquippedWeapon(unitSrc) === null) {
			return false;
		}
		
		// 攻撃する者とされる者が同一である場合は、戦闘を開始しない
		if (unitSrc === unitDest) {
			return false;
		}
		
		// ユニットが死亡している場合は、戦闘を開始しない
		if (unitSrc.getAliveState() !== AliveType.ALIVE || unitDest.getAliveState() !== AliveType.ALIVE) {
			return false;
		}
		
		return true;
	}
}
);
