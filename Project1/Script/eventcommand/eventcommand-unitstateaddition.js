
var UnitStateAdditionMode = {
	TOP: 0,
	AVOID: 1
};

var UnitStateAdditionEventCommand = defineObject(BaseEventCommand,
{
	_targetUnit: null,
	_increaseType: 0,
	_targetState: null,
	_dynamicAnime: null,
	_isHit: false,
	_easyMapUnit: null,
	
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
		
		if (mode === UnitStateAdditionMode.TOP) {
			result = this._moveTop();
		}
		else if (mode === UnitStateAdditionMode.AVOID) {
			result = this._moveAvoid();
		}
		
		return result;
	},
	
	drawEventCommandCycle: function() {
		var mode = this.getCycleMode();
		
		if (mode === UnitStateAdditionMode.TOP) {
			this._drawTop();
		}
		else if (mode === UnitStateAdditionMode.AVOID) {
			this._drawAvoid();
		}
	},
	
	mainEventCommand: function() {
		this._isHit = StateControl.checkStateInvocation(this._launchUnit, this._targetUnit, root.getEventCommandObject()) !== null;
		
		if (this._isHit) {
			StateControl.arrangeState(this._targetUnit, this._targetState, this._increaseType);
		}
	},
	
	_prepareEventCommandMemberData: function() {
		var eventCommandData = root.getEventCommandObject();
		
		this._launchUnit = eventCommandData.getLaunchUnit();
		this._targetUnit = eventCommandData.getTargetUnit();
		this._increaseType = eventCommandData.getIncreaseValue();
		this._targetState = eventCommandData.getStateInvocation().getState();
		this._dynamicAnime = createObject(DynamicAnime);
	},
	
	_checkEventCommand: function() {
		if (this._targetUnit === null || this._targetState === null) {
			return false;
		}
		
		return this.isEventCommandContinue();
	},
	
	_completeEventCommandMemberData: function() {
		var x = LayoutControl.getPixelX(this._targetUnit.getMapX());
		var y = LayoutControl.getPixelY(this._targetUnit.getMapY());
		var anime = this._targetState.getEasyAnime();
		var pos = LayoutControl.getMapAnimationPos(x, y, anime);
		
		this._dynamicAnime.startDynamicAnime(anime, pos.x, pos.y);
		
		this.changeCycleMode(UnitStateAdditionMode.TOP);
		
		return EnterResult.OK;
	},
	
	_moveTop: function() {
		if (this._dynamicAnime.moveDynamicAnime() !== MoveResult.CONTINUE) {
			this.mainEventCommand();
			if (this._isHit) {
				return MoveResult.END;
			}
			
			// 命中しなかった場合は、ユニットが回避したように動かす
			this._easyMapUnit = createObject(EvasionMapUnit);
			this._easyMapUnit.setupEvasionMapUnit(this._targetUnit, true);
			this._easyMapUnit.startEvasion(this._targetUnit);
			this._targetUnit.setInvisible(true);
			
			this.changeCycleMode(UnitStateAdditionMode.AVOID);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveAvoid: function() {
		this._easyMapUnit.moveMapUnit();
		if (this._easyMapUnit.isActionLast()) {
			this._targetUnit.setInvisible(false);
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	_drawTop: function() {
		this._dynamicAnime.drawDynamicAnime();
	},
	
	_drawAvoid: function() {
		this._easyMapUnit.drawMapUnit();
	}
}
);
