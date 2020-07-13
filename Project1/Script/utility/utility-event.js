
var EventCommonArray = {
	createArray: function(eventList, eventType) {
		var i, count, event, list;
		var firstArray = [];
		var lastArray = [];
		var eventArray = [];
		
		if (this._isMapCommonDisabled || root.getBaseScene() === SceneType.REST) {
			count = eventList.getCount();
			for (i = 0; i < count; i++) {
				eventArray.push(eventList.getData(i));
			}
			return eventArray;
		}
		
		list = root.getCurrentSession().getMapCommonEventList();
		count = list.getCount();
		for (i = 0; i < count; i++) {
			event = list.getData(i);
			if (event.getCommonEventInfo().getEventType() === eventType) {
				if (event.getCommonEventInfo().isFirst()) {
					firstArray.push(event);
				}
				else {
					lastArray.push(event);
				}
			}
		}
		
		count = firstArray.length;
		for (i = 0; i < count; i++) {
			eventArray.push(firstArray[i]);
		}
		
		count = eventList.getCount();
		for (i = 0; i < count; i++) {
			eventArray.push(eventList.getData(i));
		}
		
		count = lastArray.length;
		for (i = 0; i < count; i++) {
			eventArray.push(lastArray[i]);
		}
		
		return eventArray;
	}
};

var EventChecker = defineObject(BaseObject,
{
	_eventArray: null,
	_capsuleEvent: null,
	_eventIndex: 0,
	_isMapCommonDisabled: false,
	_isAllSkipEnabled: false,
	
	enterEventChecker: function(eventList, eventType) {
		this._eventArray = this._createEventArray(eventList, eventType);
		
		this._capsuleEvent = createObject(CapsuleEvent);
		this._eventIndex = 0;
		
		// EventCommandManagerがイベントの終了を追跡できるようにする
		EventCommandManager.setActiveEventChecker(this);
		
		return this._checkEvent();
	},
	
	moveEventChecker: function() {
		if (this._capsuleEvent === null) {
			EventCommandManager.setActiveEventChecker(null);
			return MoveResult.END;
		}
		
		if (this._capsuleEvent.moveCapsuleEvent() !== MoveResult.CONTINUE) {
			if (this._checkEvent() === EnterResult.NOTENTER) {
				EventCommandManager.setActiveEventChecker(null);
				this._capsuleEvent = null;
				return MoveResult.END;
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	disableMapCommonEvent: function() {
		this._isMapCommonDisabled = true;
	},
	
	enableAllSkip: function() {
		this._isAllSkipEnabled = true;
	},
	
	_createEventArray: function(eventList, eventType) {
		return EventCommonArray.createArray(eventList, eventType);
	},
	
	_checkEvent: function() {
		var i, count, event, result;
		
		count = this._eventArray.length;
		for (i = this._eventIndex; i < count; i++) {
			this._eventIndex++;
			event = this._eventArray[i];
			
			if (event !== null && event.isEvent() && event.getExecutedMark() === EventExecutedType.FREE) {
				if (this._isAllSkipEnabled) {
					root.setEventSkipMode(true);
				}
				
				result = this._capsuleEvent.enterCapsuleEvent(event, true);
				if (result === EnterResult.OK) {
					return EnterResult.OK;
				}
			}
		}
		
		return EnterResult.NOTENTER;
	}
}
);

var RestAutoEventChecker = defineObject(EventChecker,
{
	_createEventArray: function(eventList, restAutoType) {
		var i, event;
		var count = eventList.getCount();
		var eventArray = [];
		
		for (i = 0; i < count; i++) {
			event = eventList.getData(i);
			if (event.getRestEventInfo().getRestAutoType() === restAutoType) {
				eventArray.push(event);
			}
		}
		
		return eventArray;
	}
}
);

var CapsuleEventMode = {
	RECOLLECTION: 0,
	NORMAL: 1,
	NONE: 2
};

var CapsuleEvent = defineObject(BaseObject,
{
	_isExecuteMark: false,
	_event: null,
	_battleUnit: null,
	
	enterCapsuleEvent: function(event, isExecuteMark) {
		var mode, result, assocEvent;
		
		if (event === null) {
			return EnterResult.NOTENTER;
		}
		
		assocEvent = event.getAssociateRecollectionEvent();
		
		this._isExecuteMark = isExecuteMark;
		
		// 回想イベントを実行する
		result = this._startRecollectionEvent(assocEvent);
		if (result === EnterResult.NOTENTER) {
			// ここが実行されるということは、回想イベントの実行を終えた、あるいは回想イベントが存在しなかったことを意味する
			
			// 通常イベントを実行する
			result = this._startNormalEvent(event);
			if (result === EnterResult.NOTENTER) {
				this.changeCycleMode(CapsuleEventMode.NONE);
				return EnterResult.NOTENTER;
			}
			
			this._event = event;
			mode = CapsuleEventMode.NORMAL;
		}
		else {
			this._event = event;
			mode = CapsuleEventMode.RECOLLECTION;
		}
		
		this.changeCycleMode(mode);
		
		return result;
	},
	
	setBattleUnit: function(unit) {
		this._battleUnit = unit;
	},
	
	moveCapsuleEvent: function() {
		var result;
		var mode = this.getCycleMode();
		
		if (mode === CapsuleEventMode.NONE) {
			return MoveResult.END;
		}
		
		if (EventCommandManager.isEventRunning(this._event)) {
			// イベントは実行中だから続行しない
			return MoveResult.CONTINUE;
		}
		
		if (mode === CapsuleEventMode.RECOLLECTION) {
			// 回想イベントが終了したら通常イベントを実行する
			result = this._startNormalEvent(this._event);
			if (result === EnterResult.NOTENTER) {
				this._doEndAction();
				return MoveResult.END;
			}
			
			this.changeCycleMode(CapsuleEventMode.NORMAL);
		}
		else if (mode === CapsuleEventMode.NORMAL) {
			// 通常イベントが終了したら処理は終わったことになる
			this._doEndAction();
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	_startNormalEvent: function(event) {
		return this._startAndMarkEvent(event, this._isExecuteMark, this._battleUnit !== null);
	},
	
	_startRecollectionEvent: function(event) {
		// 回想イベントは常に実行済みとするため、第2引数はtrue
		return this._startAndMarkEvent(event, true, false);
	},
	
	_startAndMarkEvent: function(event, isExecuteMark, isBattle) {
		if (event === null) {
			return EnterResult.NOTENTER;
		}
		
		// イベントコマンドの「イベントの状態変更」で、実行済みマークを無効にできるようするべく、
		// startEvent/startBattleEventより先に実行する。
		if (isExecuteMark) {
			// これにより、イベントは実行済みになる
			event.setExecutedMark(EventExecutedType.EXECUTED);
		}
		
		if (isBattle) {
			event.startBattleEvent(this._battleUnit);
		}
		else {
			event.startEvent();
		}
		
		return EventCommandManager.returnEnterCode();
	},
	
	_doEndAction: function() {
		root.setEventSkipMode(false);
	}
}
);

var DynamicEvent = defineObject(BaseObject,
{
	_generator: null,
	_event: null,
	
	acquireEventGenerator: function() {
		this._generator = root.getEventGenerator();
		
		return this._generator;
	},
	
	executeDynamicEvent: function() {
		this._event = this._generator.execute();
		
		return EventCommandManager.returnEnterCode();
	},
	
	moveDynamicEvent: function() {
		if (EventCommandManager.isEventRunning(this._event)) {
			return MoveResult.CONTINUE;
		}
		
		return MoveResult.END;
	}
}
);

var DynamicAnime = defineObject(BaseObject,
{
	_motion: null,
	
	startDynamicAnime: function(anime, x, y) {
		var motionParam;
		
		if (anime === null) {
			return null;
		}
		
		motionParam = StructureBuilder.buildMotionParam();
		motionParam.animeData = anime;
		motionParam.x = x;
		motionParam.y = y;
		motionParam.isRight = true;
		motionParam.motionId = 0;
		
		this._motion = createObject(AnimeMotion);
		this._motion.setMotionParam(motionParam);
		
		return this._motion;
	},
	
	moveDynamicAnime: function() {
		var result;
		
		if (this._motion === null || InputControl.isStartAction()) {
			return MoveResult.END;
		}
		
		result = this._motion.moveMotion();
		
		this._arrangeScreenEffect(true);
		
		if (result !== MoveResult.CONTINUE) {
			return MoveResult.CONTINUE;
		}
		
		this._motion.nextFrame();
		if (this._motion.isLastFrame()) {
			this._arrangeScreenEffect(false);
			this._motion = null;
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawDynamicAnime: function() {
		if (this._motion === null) {
			return;
		}
		
		// EffectRangeType.ALLは明示的に処理する
		if (this._motion.getScreenEffectRangeType() === EffectRangeType.ALL) {
			this._drawScreenColor();
		}
		
		this._motion.drawMotion(0, 0);
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
		return this._motion.getX();
	},
	
	getEffectY: function() {
		return this._motion.getY();
	},
	
	getFrameIndex: function() {
		return this._motion.getFrameIndex();
	},
	
	getFrameCount: function() {
		return this._motion.getFrameCount();
	},
	
	getAnimeMotion: function() {
		return this._motion;
	},
	
	_arrangeScreenEffect: function(isSet) {
		var effectRangeType = this._motion.getScreenEffectRangeType();
		
		if (effectRangeType === EffectRangeType.MAP || effectRangeType === EffectRangeType.MAPANDCHAR) {
			if (isSet) {
				MapLayer.setEffectRangeData(this._motion.getScreenColor(), this._motion.getScreenAlpha(), effectRangeType);
			}
			else {
				MapLayer.setEffectRangeData(0, 0, EffectRangeType.NONE);
			}
		}
	},
	
	_drawScreenColor: function() {
		var color = this._motion.getScreenColor();
		var alpha = this._motion.getScreenAlpha();
		
		root.getGraphicsManager().fillRange(0, 0, root.getGameAreaWidth(), root.getGameAreaHeight(), color, alpha);
	}
}
);
