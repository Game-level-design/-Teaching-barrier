
var CycleCounter = defineObject(BaseObject,
{
	_max: 0,
	_incrementValue: 0,
	_counterValue: 0,
	_isGameAccelerationDisabled: false,
	
	// maxは偶数であることが推奨される
	setCounterInfo: function(max) {
		this._max = max + 2;
		this._incrementValue = 1;
		this._counterValue = 0;
		
		// 30FPSの場合は、増加する値が2倍になる
		if (!DataConfig.isHighPerformance()) {
			this._incrementValue *= 2;
		}
	},
	
	disableGameAcceleration: function() {
		// 高速化を受け付けないようにする
		this._isGameAccelerationDisabled = true;
	},
	
	moveCycleCounter: function() {
		var result;
		
		// キャンセルキーの押下による高速化が発生している場合は、直ちに終了する
		if (!this._isGameAccelerationDisabled && Miscellaneous.isGameAcceleration()) {
			return MoveResult.END;
		}
		
		this._counterValue += this._incrementValue;
		if (this._counterValue >= this._max) {
			this._counterValue = 0;
			result = MoveResult.END;
		}
		else {
			result = MoveResult.CONTINUE;
		}
		
		return result;
	},
	
	// _counterValueは、setCounterInfoに指定された値まで大きくなる
	getCounter: function() {
		return this._counterValue;
	},
	
	resetCounterValue: function() {
		this._counterValue = 0;
	}
}
);

var IdleCounter = defineObject(BaseObject,
{
	_counter: null,
	_nextmode: 0,
	
	initialize: function() {
		this._counter = createObject(CycleCounter);
	},
	
	setIdleInfo: function(max, nextmode) {
		this._nextmode = nextmode;
		this._counter.setCounterInfo(max);
	},
	
	moveIdleCounter: function() {
		return this._counter.moveCycleCounter();
	},
	
	getCounter: function() {
		return this._counter.getCounter();
	},
	
	getNextMode: function() {
		return this._nextmode;
	}
}
);

var EraseCounter = defineObject(BaseObject,
{
	_counter: null,
	_isFirst: true,
	
	initialize: function() {
		this._counter = createObject(CycleCounter);
		this._counter.setCounterInfo(26);
	},
	
	moveEraseCounter: function() {
		if (this._isFirst) {
			this._playEraseSound();
			this._isFirst = false;
		}
	
		return this._counter.moveCycleCounter();
	},
	
	getEraseAlpha: function() {
		var alpha = 255 - (this._counter.getCounter() * 10);
		
		if (alpha < 0) {
			alpha = 0;
		}
		
		return alpha;	
	},
	
	_playEraseSound: function() {
		MediaControl.soundDirect('uniterase');
	}
}
);

var UnitCounter = defineObject(BaseObject,
{
	_counter: null,
	_counter2: null,
	_unitAnimationIndex: 0,
	_unitAnimationIndex2: 0,
	
	initialize: function() {
		this._counter = createObject(CycleCounter);
		this._counter.setCounterInfo(14);
		this._counter.disableGameAcceleration();
		
		// 2チップで構成されるキャラチップ用
		this._counter2 = createObject(CycleCounter);
		this._counter2.setCounterInfo(34);
		this._counter2.disableGameAcceleration();
	},
	
	moveUnitCounter: function() {
		var result = this._counter.moveCycleCounter();
		
		if (result !== MoveResult.CONTINUE) {
			if (++this._unitAnimationIndex === 4) {
				this._unitAnimationIndex = 0;
			}
		}
		
		result = this._counter2.moveCycleCounter();
		if (result !== MoveResult.CONTINUE) {
			if (++this._unitAnimationIndex2 === 2) {
				this._unitAnimationIndex2 = 0;
			}
		}
	
		return result;
	},
	
	getAnimationIndex: function() {
		var a = [0, 1, 2, 1];
		
		return a[this._unitAnimationIndex];
	},
	
	getAnimationIndex2: function() {
		return this._unitAnimationIndex2;
	},
	
	getAnimationIndexFromUnit: function(unit) {
		var index = 0;
		var type = unit.getClass().getCharChipLoopType();
		
		if (type === CharChipLoopType.NORMAL) {
			index = this.getAnimationIndex();
		}
		else if (type === CharChipLoopType.DOUBLE) {
			index = this.getAnimationIndex2();
		}
	
		return index;
	}
}
);

var VolumeCounter = defineObject(BaseObject,
{
	_volume: 0,
	_max: 0,
	_min: 0,
	_isUp: false,
	_roundCount: 0, 
	_speed: 0,
	_isGameAccelerationDisabled: false,
	
	initialize: function() {
		this.setChangeSpeed(3);
	},
	
	disableGameAcceleration: function() {
		this._isGameAccelerationDisabled = true;
	},
	
	setChangeSpeed: function(speed) {
		this._speed = speed;
		
		if (!DataConfig.isHighPerformance()) {
			this._speed *= 2;
		}
	},
	
	setVolumeRange: function(max, min, volume, isUp) {
		this._max = max;
		this._min = min;
		this._volume = volume;
		this._isUp = isUp;
		
		this._roundCount = 0;
	},
	
	moveVolumeCounter: function() {
		var d = this._speed;
		
		if (!this._isGameAccelerationDisabled && Miscellaneous.isGameAcceleration()) {
			d *= 4;
		}
		
		if (this._isUp) {
			this._volume += d;
			if (this._volume >= this._max) {
				this._volume = this._max;
				this._isUp = false;
				this._roundCount++;
			}
		}
		else {
			this._volume -= d;
			if (this._volume < this._min) {
				this._volume = this._min;
				this._isUp = true;
				this._roundCount++;
			}
		}
		
		if (this._roundCount === 3) {
			this._roundCount = 2;
		}
	
		return true;
	},
	
	getVolume: function() {
		return this._volume;
	},
	
	setVolume: function(volume) {
		this._volume = volume;
	},
	
	isUp: function() {
		return this._isUp;
	},
	
	getRoundCount: function() {
		return this._roundCount;
	}
}
);
