
var BaseBattleTable = defineObject(BaseObject,
{
	_battleObject: null,
	_straightFlowBattleStart: null,
	_straightFlowBattleEnd: null,
	_straightFlowActionStart: null,
	_straightFlowActionEnd: null,
	_isMusicPlay: false,
	_isBattleStart: true,
	
	initialize: function() {
		this._straightFlowBattleStart = createObject(StraightFlow);
		this._straightFlowBattleEnd = createObject(StraightFlow);
		this._straightFlowActionStart = createObject(StraightFlow);
		this._straightFlowActionEnd = createObject(StraightFlow);
		
		this._straightFlowBattleStart.setStraightFlowData(this);
		this._straightFlowBattleEnd.setStraightFlowData(this);
		this._straightFlowActionStart.setStraightFlowData(this);
		this._straightFlowActionEnd.setStraightFlowData(this);
		
		this._pushFlowEntriesBattleStart(this._straightFlowBattleStart);
		this._pushFlowEntriesBattleEnd(this._straightFlowBattleEnd);
		this._pushFlowEntriesActionStart(this._straightFlowActionStart);
		this._pushFlowEntriesActionEnd(this._straightFlowActionEnd);
	},
	
	setBattleObject: function(battleObject) {
		this._battleObject = battleObject;
	},
	
	getBattleObject: function() {
		return this._battleObject;
	},
	
	enterBattleStart: function() {
		this._straightFlowBattleStart.resetStraightFlow();
		return this._straightFlowBattleStart.enterStraightFlow();
	},
	
	enterBattleEnd: function() {
		this._straightFlowBattleEnd.resetStraightFlow();
		return this._straightFlowBattleEnd.enterStraightFlow();
	},
	
	enterActionStart: function() {
		this._straightFlowActionStart.resetStraightFlow();
		return this._straightFlowActionStart.enterStraightFlow();
	},
	
	enterActionEnd: function() {
		this._straightFlowActionEnd.resetStraightFlow();
		return this._straightFlowActionEnd.enterStraightFlow();
	},
	
	moveBattleStart: function() {
		return this._straightFlowBattleStart.moveStraightFlow();
	},
	
	moveBattleEnd: function() {
		return this._straightFlowBattleEnd.moveStraightFlow();
	},
	
	moveActionStart: function() {
		return this._straightFlowActionStart.moveStraightFlow();
	},
	
	moveActionEnd: function() {
		return this._straightFlowActionEnd.moveStraightFlow();
	},
	
	drawBattleStart: function() {
		this._straightFlowBattleStart.drawStraightFlow();
	},
	
	drawBattleEnd: function() {
		this._straightFlowBattleEnd.drawStraightFlow();
	},
	
	drawActionStart: function() {
		this._straightFlowActionStart.drawStraightFlow();
	},
	
	drawActionEnd: function() {
		this._straightFlowActionEnd.drawStraightFlow();
	},
	
	isMusicPlay: function() {
		return this._isMusicPlay;
	},
	
	setMusicPlayFlag: function(isPlay) {
		this._isMusicPlay = isPlay;
	},
	
	endMusic: function() {
		if (this._isBattleStart && this._isMusicPlay) {
			MediaControl.musicStop(MusicStopType.BACK);
		}
		
		MediaControl.resetSoundList();
	},
	
	_pushFlowEntriesBattleStart: function(straightFlow) {
	},
	
	_pushFlowEntriesBattleEnd: function(straightFlow) {
	},
	
	_pushFlowEntriesActionStart: function(straightFlow) {
	},
	
	_pushFlowEntriesActionEnd: function(straightFlow) {
	}
}
);


//---------------------------------------------


var EasyBattleTable = defineObject(BaseBattleTable,
{
	_pushFlowEntriesBattleStart: function(straightFlow) {
		straightFlow.pushFlowEntry(EasyStartFlowEntry);
	},
	
	_pushFlowEntriesBattleEnd: function(straightFlow) {
		straightFlow.pushFlowEntry(EasyEndFlowEntry);
	},
	
	_pushFlowEntriesActionStart: function(straightFlow) {
		straightFlow.pushFlowEntry(EasyInterruptSkillFlowEntry);
	},
	
	_pushFlowEntriesActionEnd: function(straightFlow) {
		straightFlow.pushFlowEntry(EasyDiagnosticStateFlowEntry);
	}
}
);

var EasyStartFlowEntry = defineObject(BaseFlowEntry,
{
	_attackFlow: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		if (this._attackFlow.moveStartFlow() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
		this._attackFlow.drawStartFlow();
	},
	
	_prepareMemberData: function(battleTable) {
	},
	
	_completeMemberData: function(battleTable) {
		this._attackFlow = battleTable.getBattleObject().getAttackFlow();
		this._attackFlow.startAttackFlow();
		
		return EnterResult.OK;
	}
}
);

var EasyEndFlowEntry = defineObject(BaseFlowEntry,
{
	_attackFlow: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		if (this._attackFlow.moveEndFlow() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
		this._attackFlow.drawEndFlow();
	},
	
	_prepareMemberData: function(battleTable) {
	},
	
	_completeMemberData: function(battleTable) {
		this._attackFlow = battleTable.getBattleObject().getAttackFlow();
		
		return EnterResult.OK;
	}
}
);

var EasyDiagnosticStateFlowEntry = defineObject(BaseFlowEntry,
{
	_index: 0,
	_effect: null,
	_battleTable: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		if (this._effect.isEffectLast()) {
			if (!this._checkNextState()) {
				return MoveResult.END;
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
	},
	
	_prepareMemberData: function(battleTable) {
		this._index = 0;
		this._effect = null;
		this._battleTable = battleTable;
	},
	
	_completeMemberData: function(battleTable) {
		return this._checkNextState() ? EnterResult.OK : EnterResult.NOTENTER;
	},
	
	_checkNextState: function() {
		var anime, battler, pos;
		var battleObject = this._battleTable.getBattleObject();
		var stateArray = battleObject.getAttackOrder().getPassiveStateArray();
		
		if (this._index >= stateArray.length) {
			return false;
		}
		
		anime = stateArray[this._index].getEasyAnime();
		if (anime === null) {
			return false;
		}
		
		battler = battleObject.getPassiveBattler();
		pos = LayoutControl.getMapAnimationPos(battler.getMapUnitX(), battler.getMapUnitY(), anime);
		this._effect = battleObject.createEasyEffect(anime, pos.x, pos.y);
		
		this._index++;
		
		return this._effect !== null;
	}
}
);

var EasyInterruptSkillFlowEntry = defineObject(BaseFlowEntry,
{
	_skillProjector: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		return this._skillProjector.moveProjector();
	},
	
	drawFlowEntry: function() {
		this._skillProjector.drawProjector();
	},
	
	_prepareMemberData: function(battleTable) {
		this._skillProjector = createObject(SkillProjector);
	},
	
	_completeMemberData: function(battleTable) {
		var battleObject = battleTable.getBattleObject();
		var activeSkillArray = battleObject.getAttackOrder().getActiveSkillArray();
		var passiveSkillArray = battleObject.getAttackOrder().getPassiveSkillArray();
		
		this._skillProjector.setupProjector(BattleType.EASY, battleObject);
		
		if (battleObject.getBattler(true).getUnit() === battleObject.getAttackOrder().getActiveUnit()) {
			if (activeSkillArray.length > 0 || passiveSkillArray.length > 0) {
				this._skillProjector.startProjector(activeSkillArray, passiveSkillArray, true);
			}
			else {
				return EnterResult.NOTENTER;
			}
		}
		else {
			if (passiveSkillArray.length > 0 || activeSkillArray.length > 0) {
				this._skillProjector.startProjector(passiveSkillArray, activeSkillArray, false);
			}
			else {
				return EnterResult.NOTENTER;
			}
		}
		
		return EnterResult.OK;
	}
}
);


//---------------------------------------------


var RealBattleTable = defineObject(BaseBattleTable,
{
	_battleTransition: null,
	
	initialize: function() {
		BaseBattleTable.initialize.call(this);
		
		this._battleTransition = createObject(BattleTransition);
		this._isBattleStart = false;
	},
	
	getBattleTransition: function() {
		return this._battleTransition;
	},
	
	isBattleStart: function() {
		return this._isBattleStart;
	},
	
	setBattleStartFlag: function(isStart) {
		this._isBattleStart = isStart;
		this.getBattleObject().setBattleLayoutVisible(true);
	},
	
	_pushFlowEntriesBattleStart: function(straightFlow) {
		straightFlow.pushFlowEntry(TransitionStartFlowEntry);
		straightFlow.pushFlowEntry(WatchLoopFlowEntry);
		straightFlow.pushFlowEntry(RealStartFlowEntry);
	},
	
	_pushFlowEntriesBattleEnd: function(straightFlow) {
		straightFlow.pushFlowEntry(RealEndFlowEntry);
		straightFlow.pushFlowEntry(TransitionEndFlowEntry);
	},
	
	_pushFlowEntriesActionStart: function(straightFlow) {
		straightFlow.pushFlowEntry(RealInterruptSkillFlowEntry);
		straightFlow.pushFlowEntry(RealCutinFlowEntry);
	},
	
	_pushFlowEntriesActionEnd: function(straightFlow) {
		straightFlow.pushFlowEntry(RealDiagnosticStateFlowEntry);
	}
}
);

// drawFlowEntry内の描画は拡大対象にならない。
// 拡大対象にするには、createEffectかpushCustomEffectを呼び出す。
var TransitionStartFlowEntry = defineObject(BaseFlowEntry,
{
	_battleTable: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		if (this._battleTable.getBattleTransition().isSecondHalf()) {
			if (!this._battleTable.isBattleStart()) {
				this._playBattleMusic();
				this._battleTable.setBattleStartFlag(true);
			}
		}
		
		if (this._battleTable.getBattleTransition().moveBattleTransition() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
		this._battleTable.getBattleTransition().drawBattleTransition();
	},
	
	_prepareMemberData: function(battleTable) {
	},
	
	_completeMemberData: function(battleTable) {
		this._battleTable = battleTable;
		this._battleTable.getBattleTransition().startBattleTransition(true);
		
		return EnterResult.OK;
	},
	
	_playBattleMusic: function() {
		var handle, handleActive;
		var battleObject = this._battleTable.getBattleObject();
		var attackInfo = battleObject.getAttackInfo();
		var unitSrc = attackInfo.unitSrc;
		var unitDest = attackInfo.unitDest;
		var handleUnitSrc = unitSrc.getBattleMusicHandle();
		var handleUnitDest = unitDest.getBattleMusicHandle();
		var mapInfo = root.getCurrentSession().getCurrentMapInfo();
		var isMusicPlay = false;
		
		if (!handleUnitSrc.isNullHandle()) {
			handle = handleUnitSrc;
		}
		else if (!handleUnitDest.isNullHandle()) {
			handle = handleUnitDest;
		}
		else {
			if (unitSrc.getUnitType() === UnitType.PLAYER) {
				// 攻撃をしかけたのが自軍ならば自軍用BGM
				handle = mapInfo.getPlayerBattleMusicHandle();
			}
			else if (unitSrc.getUnitType() === UnitType.ALLY) {
				handle = mapInfo.getAllyBattleMusicHandle();
			}
			else {
				handle = mapInfo.getEnemyBattleMusicHandle();
			}
		}
		
		if (handle.isNullHandle()) {
			isMusicPlay = false;
		}
		else {
			handleActive = root.getMediaManager().getActiveMusicHandle();
			if (handle.isEqualHandle(handleActive)) {
				// 再生しようとしたBGMが既に再生されているから再生しない
				isMusicPlay = false;
			}
			else {
				MediaControl.musicPlay(handle);
				isMusicPlay = true;
			}
		}
		
		this._battleTable.setMusicPlayFlag(isMusicPlay);
	}
}
);

var TransitionEndFlowEntry = defineObject(BaseFlowEntry,
{
	_battleTable: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		if (this._battleTable.getBattleTransition().moveBattleTransition() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
		this._battleTable.getBattleTransition().drawBattleTransition();
	},
	
	_prepareMemberData: function(battleTable) {
	},
	
	_completeMemberData: function(battleTable) {
		this._battleTable = battleTable;
		this._battleTable.getBattleTransition().startBattleTransition(false);
		
		return EnterResult.OK;
	}
}
);

// 待機モーションがループ処理(または最終フレーム)に入るまで、
// 次のFlowEntry(戦闘時ユニットイベント)を実行しない。
// これにより、剣を構えてから会話が始まるなどの演出が可能になる。
var WatchLoopFlowEntry = defineObject(BaseFlowEntry,
{
	_battleTable: null,
	_battlerRight: null,
	_battlerLeft: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		if (this._battlerRight.isLoopZone() && this._battlerLeft.isLoopZone()) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
	},
	
	_prepareMemberData: function(battleTable) {
		var battleObject = battleTable.getBattleObject();
		
		this._battleTable = battleTable;
		this._battlerRight = battleObject.getBattler(true);
		this._battlerLeft = battleObject.getBattler(false);
	},
	
	_completeMemberData: function(battleTable) {
		return EnterResult.OK;
	}
}
);

var RealStartFlowEntry = defineObject(BaseFlowEntry,
{
	_attackFlow: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		if (this._attackFlow.moveStartFlow() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
		this._attackFlow.drawStartFlow();
	},
	
	_prepareMemberData: function(battleTable) {
	},
	
	_completeMemberData: function(battleTable) {
		this._attackFlow = battleTable.getBattleObject().getAttackFlow();
		this._attackFlow.startAttackFlow();
		
		return EnterResult.OK;
	}
}
);

var RealEndFlowEntry = defineObject(BaseFlowEntry,
{
	_attackFlow: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		if (this._attackFlow.moveEndFlow() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
		this._attackFlow.drawEndFlow();
	},
	
	_prepareMemberData: function(battleTable) {
	},
	
	_completeMemberData: function(battleTable) {
		this._attackFlow = battleTable.getBattleObject().getAttackFlow();
		
		return EnterResult.OK;
	}
}
);

var RealDiagnosticStateFlowEntry = defineObject(BaseFlowEntry,
{
	_index: 0,
	_effect: null,
	_battleTable: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		if (this._effect.isEffectLast()) {
			if (!this._checkNextState()) {
				return MoveResult.END;
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
	},
	
	_prepareMemberData: function(battleTable) {
		this._index = 0;
		this._effect = null;
		this._battleTable = battleTable;
	},
	
	_completeMemberData: function(battleTable) {
		return this._checkNextState() ? EnterResult.OK : EnterResult.NOTENTER;
	},
	
	_checkNextState: function() {
		var anime, battler, isRight, pos;
		var battleObject = this._battleTable.getBattleObject();
		var stateArray = battleObject.getAttackOrder().getPassiveStateArray();
		
		if (this._index >= stateArray.length) {
			return false;
		}
		
		anime = stateArray[this._index].getRealAnime();
		if (anime === null) {
			return false;
		}
		
		battler = battleObject.getPassiveBattler();
		isRight = battler === battleObject.getBattler(true);
		pos = battler.getEffectPos(anime);
		this._effect = battleObject.createEffect(anime, pos.x, pos.y, isRight, false);
		
		this._index++;
		
		return this._effect !== null;
	}
}
);

var RealInterruptSkillFlowEntry = defineObject(BaseFlowEntry,
{
	_skillProjector: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		return this._skillProjector.moveProjector();
	},
	
	drawFlowEntry: function() {
		this._skillProjector.drawProjector();
	},
	
	_prepareMemberData: function(battleTable) {
		this._skillProjector = createObject(SkillProjector);
	},
	
	_completeMemberData: function(battleTable) {
		var battleObject = battleTable.getBattleObject();
		var activeSkillArray = battleObject.getAttackOrder().getActiveSkillArray();
		var passiveSkillArray = battleObject.getAttackOrder().getPassiveSkillArray();
		
		this._skillProjector.setupProjector(BattleType.REAL, battleObject);
		
		if (battleObject.getBattler(true).getUnit() === battleObject.getAttackOrder().getActiveUnit()) {
			if (activeSkillArray.length > 0 || passiveSkillArray.length > 0) {
				this._skillProjector.startProjector(activeSkillArray, passiveSkillArray, true);
			}
			else {
				return EnterResult.NOTENTER;
			}
		}
		else {
			if (passiveSkillArray.length > 0 || activeSkillArray.length > 0) {
				this._skillProjector.startProjector(passiveSkillArray, activeSkillArray, false);
			}
			else {
				return EnterResult.NOTENTER;
			}
		}
		
		return EnterResult.OK;
	}
}
);

var RealCutinFlowEntry = defineObject(BaseFlowEntry,
{
	_index: 0,
	_effect: null,
	_battleTable: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		if (this._effect.isEffectLast()) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
	},
	
	_prepareMemberData: function(battleTable) {
		this._index = 0;
		this._effect = null;
		this._battleTable = battleTable;
	},
	
	_completeMemberData: function(battleTable) {
		var order = battleTable.getBattleObject().getAttackOrder();
		var type = order.getActiveMotionActionType();
		var unit = order.getActiveUnit();
		var attackTemplateType = BattlerChecker.findAttackTemplateTypeFromUnit(unit);
		var anime = unit.getCutinAnime(attackTemplateType, type);
		
		return this._createCutin(anime) ? EnterResult.OK : EnterResult.NOTENTER;
	},
	
	_createCutin: function(anime) {
		var pos;
		var battleObject = this._battleTable.getBattleObject();
		var battler = battleObject.getActiveBattler();
		var isRight = battler === battleObject.getBattler(true);
		
		if (anime === null || !this._isCutinAllowed()) {
			return false;
		}
		
		if (root.getAnimePreference().isCutinCentering()) {
			pos = this._getCenterPos(anime);
		}
		else {
			pos = this._getBattlerPos(anime);
		}
		
		pos.x += root.getAnimePreference().getCutinOffsetX();
		pos.y += root.getAnimePreference().getCutinOffsetY();
		
		this._effect = battleObject.createEffect(anime, pos.x, pos.y, isRight, false);
		
		return this._effect !== null;
	},
	
	_getCenterPos: function(anime) {
		var battleObject = this._battleTable.getBattleObject();
		var area = battleObject.getBattleArea();
		var size = Miscellaneous.getFirstKeySpriteSize(anime, 0);
		var x = Math.floor(area.width / 2) - Math.floor(size.width / 2);
		var y = Math.floor(area.height / 2) - Math.floor(size.height / 2);
		var pos = createPos(x, y);
		
		pos.x += battleObject.getAutoScroll().getScrollX();
		
		return pos;
	},
	
	_getBattlerPos: function(anime) {
		var battleObject = this._battleTable.getBattleObject();
		var battler = battleObject.getActiveBattler();
		var pos = battler.getEffectPos(anime);
		
		return pos;
	},
	
	_isCutinAllowed: function() {
		// コンフィグにカットインオフが入る可能性
		return true;
	}
}
);

var BattleTransition = defineObject(BaseObject,
{
	_xTransition: 0,
	_xSrc: 0,
	_transition: null,
	_isStart: false,
	
	startBattleTransition: function(isStart) {
		this._isStart = isStart;
		
		if (this._isStart) {
			this._changeStartTransition();
		}
		else {
			this._changeEndTransition();
		}
	},
	
	moveBattleTransition: function() {
		var result;
		
		if (this._isStart) {
			result = this._moveStartTransition();
		}
		else {
			result = this._moveEndTransition();
		}
		
		return result;
	},
	
	drawBattleTransition: function() {
		root.getGraphicsManager().enableMapClipping(false);
		
		if (this._isStart) {
			this._drawStartTransition();
		}
		else {
			this._drawEndTransition();
		}
		
		root.getGraphicsManager().enableMapClipping(true);
	},
	
	isSecondHalf: function() {
		return this._xSrc > 640;
	},
	
	_changeStartTransition: function() {
		this._xTransition = RealBattleArea.WIDTH;
		this._xSrc = 0 - this._getMargin();
	},
	
	_changeEndTransition: function() {
		this._transition = createObject(FadeTransition);
		this._transition.setFadeSpeed(8);
		this._transition.setDestOut();
	},
	
	_moveStartTransition: function() {
		this._xSrc += this._getScrollPixel();
		
		if (this._xSrc > 1280 + this._getMargin()) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveEndTransition: function() {
		if (this._transition.moveTransition() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	_drawStartTransition: function() {
		var handle = root.queryGraphicsHandle('battletransition');
		var pic = GraphicsRenderer.getGraphics(handle, GraphicsType.PICTURE);
		var x = this._xSrc;
		
		if (pic !== null) {
			pic.drawStretchParts(0, 0, root.getGameAreaWidth(), root.getGameAreaHeight(), x, 0, 640, 480);
		}
	},
	
	_drawEndTransition: function() {
		this._transition.drawTransition();
	},
	
	_getScrollPixel: function() {
		var d = 40;
	
		if (!DataConfig.isHighPerformance()) {
			d *= 2;
		}
		
		if (Miscellaneous.isGameAcceleration()) {
			d *= 2;
		}
		
		return d;
	},
	
	_getMargin: function() {
		return 360;
	}
}
);
