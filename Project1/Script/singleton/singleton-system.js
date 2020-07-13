
var IndexArray = {
	createIndexArray: function(x, y, item) {
		var i, rangeValue, rangeType, arr;
		var startRange = 1;
		var endRange = 1;
		var count = 1;
		
		if (item === null) {
			startRange = 1;
			endRange = 1;
		}
		else if (item.isWeapon()) {
			startRange = item.getStartRange();
			endRange = item.getEndRange();
		}
		else {
			if (item.getItemType() === ItemType.TELEPORTATION && item.getRangeType() === SelectionRangeType.SELFONLY) {
				rangeValue = item.getTeleportationInfo().getRangeValue();
				rangeType = item.getTeleportationInfo().getRangeType();
			}
			else {
				rangeValue = item.getRangeValue();
				rangeType = item.getRangeType();
			}
			
			if (rangeType === SelectionRangeType.SELFONLY) {
				return [];
			}
			else if (rangeType === SelectionRangeType.MULTI) {
				endRange = rangeValue;
			}
			else if (rangeType === SelectionRangeType.ALL) {
				count = CurrentMap.getSize();
				
				arr = [];
				arr.length = count;
				for (i = 0; i < count; i++) {
					arr[i] = i;
				}
				
				return arr;
			}
		}
		
		return this.getBestIndexArray(x, y, startRange, endRange);
	},
	
	createRangeIndexArray: function(x, y, rangeMetrics) {
		var i, count, arr;
		
		if (rangeMetrics.rangeType === SelectionRangeType.SELFONLY) {
			return [CurrentMap.getIndex(x, y)];
		}
		else if (rangeMetrics.rangeType === SelectionRangeType.ALL) {
			count = CurrentMap.getSize();
			
			arr = [];
			arr.length = count;
			for (i = 0; i < count; i++) {
				arr[i] = i;
			}
			
			return arr;
		}
		
		return this.getBestIndexArray(x, y, rangeMetrics.startRange, rangeMetrics.endRange);
	},
	
	getBestIndexArray: function(x, y, startRange, endRange) {
		var simulator = root.getCurrentSession().createMapSimulator();
		
		simulator.startSimulationRange(x, y, startRange, endRange);
		
		return simulator.getSimulationIndexArray();
	},
	
	findUnit: function(indexArray, targetUnit) {
		var i, index, x, y;
		var count = indexArray.length;
		
		if (count === CurrentMap.getSize()) {
			return true;
		}
		
		for (i = 0; i < count; i++) {
			index = indexArray[i];
			x = CurrentMap.getX(index);
			y = CurrentMap.getY(index);
			if (PosChecker.getUnitFromPos(x, y) === targetUnit) {
				return true;
			}
		}
		
		return false;
	},
	
	findPos: function(indexArray, xTarget, yTarget) {
		var i, index, x, y;
		var count = indexArray.length;
		
		if (count === CurrentMap.getSize()) {
			return true;
		}
		
		for (i = 0; i < count; i++) {
			index = indexArray[i];
			x = CurrentMap.getX(index);
			y = CurrentMap.getY(index);
			if (x === xTarget && y === yTarget) {
				return true;
			}
		}
		
		return false;
	}
};

var Probability = {
	getProbability: function(percent) {
		var n;
		
		if (percent >= this.getMaxPercent()) {
			// 100以上は無条件にtrueを返す
			return true;
		}
		
		if (percent <= 0) {
			return false;
		}
		
		// nは0から99の値になる
		n = this.getRandomNumber() % 100;
		
		return percent >= n;
	},
	
	getInvocationProbability: function(unit, type, value) {
		var n, hp, result;
		
		if (type === InvocationType.HPDOWN) {
			n = value / 100;
			hp = ParamBonus.getMhp(unit) * n;
			result = unit.getHp() <= hp;
		}
		else if (type === InvocationType.ABSOLUTE) {
			result = Probability.getProbability(value);
		}
		else if (type === InvocationType.LV) {
			result = Probability.getProbability(unit.getLv() * value);
		}
		else {
			if (DataConfig.isSkillInvocationBonusEnabled()) {
				result = Probability.getProbability(ParamBonus.getBonus(unit, type) * value);
			}
			else {
				result = Probability.getProbability(unit.getParamValue(type) * value);
			}
		}
		
		return result;
	},
	
	getRandomNumber: function() {
		return root.getRandomNumber();
	},
	
	getMaxPercent: function() {
		return 100;
	}
};

var GameOverChecker = {
	isGameOver: function() {
		var i, count, unit;
		var list = PlayerList.getSortieList();
		var isGameOver = false;
		
		// 自軍が存在しない場合はゲームオーバー
		if (list.getCount() === 0 && root.getCurrentSession().isMapState(MapStateType.PLAYERZEROGAMEOVER)) {
			isGameOver = true;
		}
		else {
			list = PlayerList.getDeathList();
			count = list.getCount();	
			for (i = 0; i < count; i++) {
				unit = list.getData(i);
				if (this.isGameOverUnit(unit)) {
					// 死亡者リストにリーダーが含まれている場合はゲームオーバー
					isGameOver = true;
					break;
				}
			}
		}
		
		return isGameOver;
	},
	
	startGameOver: function() {
		var generator = root.getEventGenerator();
		
		generator.sceneChange(SceneChangeType.GAMEOVER);
		generator.execute();
		
		return true;
	},
	
	isGameOverUnit: function(unit) {
		return unit.getImportance() === ImportanceType.LEADER && DataConfig.isLeaderGameOver();
	}
};

var DamageControl = {
	setDeathState: function(unit) {
		// ゲームオーバーを引き起こすユニットではなく、かつ負傷可能ユニットである場合は、負傷状態にする
		if (!GameOverChecker.isGameOverUnit(unit) && Miscellaneous.isInjuryAllowed(unit)) {
			unit.setAliveState(AliveType.INJURY);
		}
		else {
			// 死亡状態にする。
			// 蘇生の可能性があるため、非出撃にはならない。
			unit.setAliveState(AliveType.DEATH);
		}
		
		// 非表示状態にする
		unit.setInvisible(true);
		
		// ステートを解除する
		StateControl.arrangeState(unit, null, IncreaseType.ALLRELEASE);
		
		MetamorphozeControl.clearMetamorphoze(unit);
	},
	
	setCatchState: function(unit, isHpChange) {
		unit.setSyncope(true);
		if (isHpChange) {
			unit.setHp(1);
		}
	},
	
	setReleaseState: function(unit) {
		unit.setAliveState(AliveType.ERASE);
		
		unit.setInvisible(true);
		unit.setSyncope(false);
		
		StateControl.arrangeState(unit, null, IncreaseType.ALLRELEASE);
	},
	
	reduceHp: function(unit, damage) {
		var hp = unit.getHp();
		
		if (damage > 0) {
			hp -= damage;
			if (hp <= 0) {
				hp = 0;
			}
		}
		else {
			hp -= damage;
			if (hp > ParamBonus.getMhp(unit)) {
				hp = ParamBonus.getMhp(unit);
			}
		}
		
		unit.setHp(hp);
	},
	
	checkHp: function(active, passive) {
		var hp = passive.getHp();
		
		if (hp > 0) {
			return;
		}
		
		if (FusionControl.getFusionAttackData(active) !== null) {
			// isLostedのために、この時点ではhpを1にしない
			this.setCatchState(passive, false);
		}
		else {
			this.setDeathState(passive);
		}
	},
	
	// 「フュージョン攻撃」によるキャッチ状態であるかを調べる
	isSyncope: function(unit) {
		return unit.isSyncope();
	},
	
	isLosted: function(unit) {
		return unit.getHp() <= 0;
	}
};

var WeaponEffectControl = {
	playDamageSound: function(unit, isCritical, isFinish) {
		if (isCritical) {
			if (isFinish) {
				this.playSound(unit, WeaponEffectSound.CRITICALFINISH);
			}
			else {
				this.playSound(unit, WeaponEffectSound.CRITICAL);
			}
		}
		else {
			if (isFinish) {
				this.playSound(unit, WeaponEffectSound.DAMAGEFINISH);
			}
			else {
				this.playSound(unit, WeaponEffectSound.DAMAGE);
			}
		}
	},
	
	getDamageAnime: function(unit, isCritical, isReal) {
		var anime;
		
		if (isCritical) {
			if (isReal) {
				anime = this.getAnime(unit, WeaponEffectAnime.REALCRITICAL);
			}
			else {
				anime = this.getAnime(unit, WeaponEffectAnime.EASYCRITICAL);
			}
		}
		else {
			if (isReal) {
				anime = this.getAnime(unit, WeaponEffectAnime.REALDAMAGE);
			}
			else {
				anime = this.getAnime(unit, WeaponEffectAnime.EASYDAMAGE);
			}
		}
		
		return anime;
	},
	
	getAnime: function(unit, type) {
		var weaponEffect;
		var anime = null;
		var weapon = BattlerChecker.getRealBattleWeapon(unit);
		var arr = ['realdamage', 'easydamage', 'realcritical', 'easycritical', 'magicinvocation'];
		
		if (weapon !== null) {
			weaponEffect = weapon.getWeaponEffect();
			anime = weaponEffect.getAnime(type, arr[type]);
		}
		
		return anime;
	},
	
	playSound: function(unit, type) {
		var weaponEffect;
		var soundHandle = null;
		var weapon = BattlerChecker.getRealBattleWeapon(unit);
		var arr = ['damage', 'damagefinish', 'critical', 'criticalfinish', 'weaponwave', 'weaponthrow', 'shootarrow'];
		
		if (weapon !== null) {
			weaponEffect = weapon.getWeaponEffect();
			soundHandle = weaponEffect.getSoundHandle(type, arr[type]);
		}
		
		if (soundHandle !== null) {
			MediaControl.soundPlay(soundHandle);
		}
	}
};

var PosChecker = {
	getUnitFromPos: function(x, y) {
		return root.getCurrentSession().getUnitFromPos(x, y);
	},
	
	getClassMovePoint: function(x, y, cls) {
		var terrain, movePoint;

		if (!CurrentMap.isMapInside(x, y)) {
			return 0;
		}
		
		// 指定位置に関連する「地形効果」を取得
		terrain = this.getTerrainFromPos(x, y);
		
		// 地形に移動するために必要な「消費移動力」を取得
		movePoint = terrain.getMovePoint(cls.getClassType().getMoveTypeId());
	
		return movePoint;
	},
	
	getTerrainFromPos: function(x, y) {
		return root.getCurrentSession().getTerrainFromPos(x, y, true);
	},
	
	getTerrainFromPosEx: function(x, y) {
		return root.getCurrentSession().getTerrainFromPos(x, y, false);
	},
	
	getPlaceEventFromUnit: function(placeType, unit) {
		var i, event, placeInfo;
		var list = root.getCurrentSession().getPlaceEventList();
		var count = list.getCount();
		
		for (i = 0; i < count; i++) {
			event = list.getData(i);
			placeInfo = event.getPlaceEventInfo();
			if (placeInfo.getPlaceEventType() === placeType) {
				if (placeInfo.getX() === unit.getMapX() && placeInfo.getY() === unit.getMapY()) {
					return event;
				}
			}
		}
		
		return null;
	},
	
	getPlaceEventFromPos: function(type, x, y) {
		var i, event, placeInfo;
		var list = root.getCurrentSession().getPlaceEventList();
		var count = list.getCount();
		
		for (i = 0; i < count; i++) {
			event = list.getData(i);
			placeInfo = event.getPlaceEventInfo();
			if (placeInfo.getPlaceEventType() === type) {
				if (placeInfo.getX() === x && placeInfo.getY() === y) {
					if (event.isEvent() && event.getExecutedMark() === EventExecutedType.FREE) {
						return event;
					}
				}
			}
		}
		
		return null;
	},
	
	getSideDirection: function(x1, y1, x2, y2) {
		var i;
		
		for (i = 0; i < DirectionType.COUNT; i++) {
			if (x1 + XPoint[i] === x2 && y1 + YPoint[i] === y2) {
				return i;
			}
		}

		return DirectionType.NULL;
	},
	
	getNearbyPos: function(unit, targetUnit) {
		return this.getNearbyPosInternal(unit.getMapX(), unit.getMapY(), targetUnit.getClass());
	},
	
	getNearbyPosInternal: function(xStart, yStart, cls) {
		var i, count, index, x, y, value, indexArray, simulator, movePoint;
		var curValue = AIValue.MAX_MOVE;
		var curIndex = -1;
		
		// simulatorを維持するため、IndexArray.getBestIndexArrayを呼び出さない
		simulator = root.getCurrentSession().createMapSimulator();
		simulator.startSimulationRange(xStart, yStart, 1, 7);
		indexArray = simulator.getSimulationIndexArray();
		
		count = indexArray.length;
		for (i = 0; i < count; i++) {
			index = indexArray[i];
			x = CurrentMap.getX(index);
			y = CurrentMap.getY(index);
			
			movePoint = PosChecker.getClassMovePoint(x, y, cls);
			if (movePoint === 0) {
				// 移動できない場所を移動対象にできない
				continue;
			}
			
			if (PosChecker.getUnitFromPos(x, y) === null) {
				value = simulator.getSimulationMovePoint(index);
				if (value < curValue) {
					curValue = value;
					curIndex = index;
				}
			}
		}
		
		if (curIndex !== -1) {
			x = CurrentMap.getX(curIndex);
			y = CurrentMap.getY(curIndex);
			return createPos(x, y);
		}
		
		return null;
	},
	
	getKeyEvent: function(x, y, keyFlag) {
		var event;
		
		if (keyFlag & KeyFlag.TREASURE) {
			event = PosChecker.getPlaceEventFromPos(PlaceEventType.TREASURE, x, y);
			if (event !== null) {
				return event;
			}
		}
		
		if (keyFlag & KeyFlag.GATE) {
			event = PosChecker.getPlaceEventFromPos(PlaceEventType.GATE, x, y);
			if (event !== null) {
				return event;
			}
		}
		
		return null;
	}
};

var KeyEventChecker = {
	getIndexArrayFromKeyType: function(unit, keyData) {
		var indexArray = [];
		var rangeType = keyData.rangeType;
		
		if (rangeType === SelectionRangeType.SELFONLY) {
			indexArray = this._getSelfIndexArray(unit, keyData);
		}
		else if (rangeType === SelectionRangeType.MULTI) {
			indexArray = this._getMultiIndexArray(unit, keyData);
		}
		else {
			indexArray = this._getAllIndexArray(unit, keyData);
		}
		
		return indexArray;
	},
	
	getKeyEvent: function(x, y, keyData) {
		var event;
		var isTreasure = this._isTreasure(keyData);
		var isGate = this._isGate(keyData);
		
		// 鍵の対象が宝箱の場合は、場所イベントが宝箱であるか調べる
		if (isTreasure) {
			event = PosChecker.getPlaceEventFromPos(PlaceEventType.TREASURE, x, y);
			if (event !== null) {
				return event;
			}
		}
		
		// 鍵の対象が扉の場合は、場所イベントが扉であるか調べる
		if (isGate) {
			event = PosChecker.getPlaceEventFromPos(PlaceEventType.GATE, x, y);
			if (event !== null) {
				return event;
			}
		}
		
		return null;
	},
	
	buildKeyDataDefault: function() {
		var keyData = {};
		
		keyData.flag = KeyFlag.TREASURE;
		keyData.requireFlag = KeyFlag.TREASURE;
		keyData.rangeValue = 0;
		keyData.rangeType = SelectionRangeType.SELFONLY;
		keyData.item = null;
		keyData.skill = null;
		
		return keyData;
	},
	
	buildKeyDataSkill: function(skill, requireFlag) {
		var keyData = {};
		var keyFlag = skill.getSkillValue();
		
		if (!(keyFlag & requireFlag)) {
			return null;
		}
		
		keyData.flag = keyFlag;
		keyData.requireFlag = requireFlag;
		keyData.rangeValue = skill.getRangeValue();
		keyData.rangeType = skill.getRangeType();
		keyData.item = null;
		keyData.skill = skill;
		
		if (this.isPairKey(skill)) {
			keyData.rangeValue = 1;
			if (keyData.requireFlag === KeyFlag.TREASURE) {
				keyData.rangeType = SelectionRangeType.SELFONLY;
			}
			else {
				keyData.rangeType = SelectionRangeType.MULTI;
			}
		}
		
		return keyData;
	},
	
	buildKeyDataItem: function(item, requireFlag) {
		var keyData = {};
		var keyFlag = item.getKeyInfo().getKeyFlag();
		
		if (!(keyFlag & requireFlag)) {
			return null;
		}
		
		keyData.flag = keyFlag;
		keyData.requireFlag = requireFlag;
		keyData.rangeValue = item.getRangeValue();
		keyData.rangeType = item.getRangeType();
		keyData.item = item;
		keyData.skill = null;
		
		if (this.isPairKey(item)) {
			keyData.rangeValue = 1;
			if (keyData.requireFlag === KeyFlag.TREASURE) {
				keyData.rangeType = SelectionRangeType.SELFONLY;
			}
			else {
				keyData.rangeType = SelectionRangeType.MULTI;
			}
		}
		
		return keyData;
	},
	
	isPairKey: function(obj) {
		var keyFlag;
		
		if (obj === null) {
			return false;
		}
		
		if (typeof obj.getItemType === 'undefined') {
			keyFlag = obj.getSkillValue();
		}
		else {
			keyFlag = obj.getKeyInfo().getKeyFlag();
		}
		
		if ((keyFlag & KeyFlag.GATE) && (keyFlag & KeyFlag.TREASURE)) {
			if (obj.getRangeType() === SelectionRangeType.SELFONLY) {
				// 扉と宝箱が対象であり、さらに射程が単体である場合は、扉を射程1として扱う
				return true;
			}
		}
		
		return false;
	},
	
	_getSelfIndexArray: function(unit, keyData) {
		var indexArray = [];
		var event = this.getKeyEvent(unit.getMapX(), unit.getMapY(), keyData);
		
		if (event !== null) {
			indexArray.push(CurrentMap.getIndex(unit.getMapX(), unit.getMapY()));
		}
		
		return indexArray;
	},
	
	_getMultiIndexArray: function(unit, keyData) {
		var i, index, x, y, event;
		var indexArrayNew = [];
		var indexArray = IndexArray.getBestIndexArray(unit.getMapX(), unit.getMapY(), 1, keyData.rangeValue);
		var count = indexArray.length;
		var isTreasure = this._isTreasure(keyData);
		var isGate = this._isGate(keyData);
		
		for (i = 0; i < count; i++) {
			index = indexArray[i];
			x = CurrentMap.getX(index);
			y = CurrentMap.getY(index);
			
			if (isTreasure) {
				event = PosChecker.getPlaceEventFromPos(PlaceEventType.TREASURE, x, y);
				if (event !== null) {
					indexArrayNew.push(index);
				}
			}
			
			if (isGate) {
				event = PosChecker.getPlaceEventFromPos(PlaceEventType.GATE, x, y);
				if (event !== null) {
					indexArrayNew.push(index);
				}
			}
		}
		
		return indexArrayNew;
	},
	
	_getAllIndexArray: function(unit, keyData) {
		var i, event, placeInfo;
		var indexArrayNew = [];
		var list = root.getCurrentSession().getPlaceEventList();
		var count = list.getCount();
		var isTreasure = this._isTreasure(keyData);
		var isGate = this._isGate(keyData);
		
		for (i = 0; i < count; i++) {
			event = list.getData(i);
			placeInfo = event.getPlaceEventInfo();
			
			if (isTreasure && placeInfo.getPlaceEventType() === PlaceEventType.TREASURE) {
				if (event.isEvent() && event.getExecutedMark() === EventExecutedType.FREE) {
					indexArrayNew.push(CurrentMap.getIndex(placeInfo.getX(), placeInfo.getY()));
				}
			}
			
			if (isGate && placeInfo.getPlaceEventType() === PlaceEventType.GATE) {
				if (event.isEvent() && event.getExecutedMark() === EventExecutedType.FREE) {
					indexArrayNew.push(CurrentMap.getIndex(placeInfo.getX(), placeInfo.getY()));
				}
			}
		}
		
		return indexArrayNew;
	},
	
	_isTreasure: function(keyData) {
		var isTreasure = keyData.requireFlag & KeyFlag.TREASURE;
		
		if (!isTreasure) {
			return false;
		}
		
		return keyData.flag & KeyFlag.TREASURE;
	},
	
	_isGate: function(keyData) {
		var isGate = keyData.requireFlag & KeyFlag.GATE;
		
		if (!isGate) {
			return false;
		}
		
		return keyData.flag & KeyFlag.GATE;
	}
};

var UnitEventChecker = {
	_isCancelFlag: false,
	
	getUnitEvent: function(unit, eventType) {
		return this._getEvent(unit, null, eventType);
	},
	
	getUnitBattleEvent: function(unit, targetUnit) {
		var event = this._getEvent(unit, targetUnit, UnitEventType.BATTLE);
		
		if (event !== null) {
			return event;
		}
		
		event = this._getEvent(targetUnit, unit, UnitEventType.BATTLE);
		if (event !== null) {
			return event;
		}
		
		return null;
	},
	
	getUnitBattleEventData: function(unit, targetUnit) {
		var event = this._getEvent(unit, targetUnit, UnitEventType.BATTLE);
		
		if (event !== null) {
			return {
				event: event,
				unit: targetUnit
			};
		}
		
		event = this._getEvent(targetUnit, unit, UnitEventType.BATTLE);
		if (event !== null) {
			return {
				event: event,
				unit: unit
			};
		}
		
		return null;
	},
	
	getUnitLostEvent: function(passiveUnit) {
		var event = null;
		
		// 自軍が倒された場合は、退却スキルを持っているかを調べる
		if (passiveUnit.getUnitType() === UnitType.PLAYER && Miscellaneous.isInjuryAllowed(passiveUnit)) {
			// 「退却時」のユニットイベントを取得する
			event = this._getEvent(passiveUnit, null, UnitEventType.INJURY);
		}
		else {
			// 「死亡時」のユニットイベントを取得する
			event = this._getEvent(passiveUnit, null, UnitEventType.DEAD);
		}
		
		return event;
	},
	
	startUnitBattleEvent: function(unit, targetUnit) {
		var event = this._getEvent(unit, targetUnit, UnitEventType.BATTLE);
		
		if (event !== null) {
			event.startBattleEvent(targetUnit);
			return event;
		}
		
		event = this._getEvent(targetUnit, unit, UnitEventType.BATTLE);
		if (event !== null) {
			event.startBattleEvent(unit);
			return event;
		}
		
		return null;
	},
	
	setCancelFlag: function(flag) {
		this._isCancelFlag = flag;
	},
	
	isCancelFlag: function() {
		return this._isCancelFlag;
	},
	
	_getEvent: function(unit, targetUnit, unitEventType) {
		var i, event, info;
		var count = unit.getUnitEventCount();
		
		for (i = 0; i < count; i++) {
			event = unit.getUnitEvent(i);
			info = event.getUnitEventInfo();
			if (info.getUnitEventType() === unitEventType) {
				if (unitEventType === UnitEventType.BATTLE) {
					if (event.isBattleEvent(targetUnit)) {
						return event;
					}
				}
				else {
					if (event.isEvent()) {
						return event;
					}
				}
			}
		}
		
		return null;
	}
};

var AttackChecker = {
	getNonStatus: function() {
		return [-1, -1, -1];
	},
	
	// 呼び出しコストは非常に大きい。
	// 一度呼び出した後は、取得した配列を保存することが推奨される。
	getAttackStatusInternal: function(unit, weapon, targetUnit) {
		var activeTotalStatus, passiveTotalStatus;
		var arr = [,,,];
		
		if (weapon === null) {
			return this.getNonStatus();
		}
		
		activeTotalStatus = SupportCalculator.createTotalStatus(unit);
		passiveTotalStatus = SupportCalculator.createTotalStatus(targetUnit);
		
		arr[0] = DamageCalculator.calculateDamage(unit, targetUnit, weapon, false, activeTotalStatus, passiveTotalStatus, 0);
		arr[1] = HitCalculator.calculateHit(unit, targetUnit, weapon, activeTotalStatus, passiveTotalStatus);
		arr[2] = CriticalCalculator.calculateCritical(unit, targetUnit, weapon, activeTotalStatus, passiveTotalStatus);

		return arr;
	},
	
	isUnitAttackable: function(unit) {
		var i, item, indexArray;
		var count = UnitItemControl.getPossessionItemCount(unit);
		
		for (i = 0; i < count; i++) {
			item = UnitItemControl.getItem(unit, i);
			if (item !== null && ItemControl.isWeaponAvailable(unit, item)) {
				indexArray = this.getAttackIndexArray(unit, item, true);
				if (indexArray.length !== 0) {
					return true;
				}
			}
		}
		
		return false;
	},
	
	// 後のバージョンで削除
	isUnitAttackableInternal: function(unit, weapon) {
		var indexArray;
		
		if (!ItemControl.isWeaponAvailable(unit, weapon)) {
			return false;
		}
	
		indexArray = AttackChecker.getAttackIndexArray(unit, weapon, true);
		
		return indexArray.length !== 0;
	},
	
	getAttackIndexArray: function(unit, weapon, isSingleCheck) {
		var i, index, x, y, targetUnit;
		var indexArrayNew = [];
		var indexArray = IndexArray.createIndexArray(unit.getMapX(), unit.getMapY(), weapon);
		var count = indexArray.length;
		
		for (i = 0; i < count; i++) {
			index = indexArray[i];
			x = CurrentMap.getX(index);
			y = CurrentMap.getY(index);
			targetUnit = PosChecker.getUnitFromPos(x, y);
			if (targetUnit !== null && unit !== targetUnit) {
				if (FilterControl.isReverseUnitTypeAllowed(unit, targetUnit)) {
					indexArrayNew.push(index);
					if (isSingleCheck) {
						return indexArrayNew;
					}
				}
			}
		}
		
		return indexArrayNew;
	},
	
	getFusionAttackIndexArray: function(unit, weapon, fusionData) {
		var i, index, x, y, targetUnit;
		var indexArrayNew = [];
		var indexArray = IndexArray.createIndexArray(unit.getMapX(), unit.getMapY(), weapon);
		var count = indexArray.length;
		
		for (i = 0; i < count; i++) {
			index = indexArray[i];
			x = CurrentMap.getX(index);
			y = CurrentMap.getY(index);
			targetUnit = PosChecker.getUnitFromPos(x, y);
			if (targetUnit !== null && unit !== targetUnit) {
				if (FusionControl.isAttackable(unit, targetUnit, fusionData) && FusionControl.isRangeAllowed(unit, targetUnit, fusionData)) {
					indexArrayNew.push(index);
				}
			}
		}
		
		return indexArrayNew;
	},
	
	// targetUnitがunitに反撃できるかどうかを調べる
	isCounterattack: function(unit, targetUnit) {
		var weapon, indexArray;
		
		if (!DataConfig.isCounterattackAllowed()) {
			return false;
		}
		
		weapon = ItemControl.getEquippedWeapon(unit);
		if (weapon !== null && weapon.isOneSide()) {
			// 攻撃する側が「一方向」の武器を装備している場合は、反撃は発生しない
			return false;
		}
		
		// 攻撃を受ける側の装備武器を取得
		weapon = ItemControl.getEquippedWeapon(targetUnit);
		
		// 武器を装備していない場合は、反撃できない
		if (weapon === null) {
			return false;
		}
		
		// 「一方向」の武器を装備している場合は反撃でない
		if (weapon.isOneSide()) {
			return false;
		}
		
		indexArray = IndexArray.createIndexArray(targetUnit.getMapX(), targetUnit.getMapY(), weapon);
		
		return IndexArray.findUnit(indexArray, unit);
	},
	
	isCounterattackPos: function(unit, targetUnit, x, y) {
		var indexArray;
		var weapon = ItemControl.getEquippedWeapon(targetUnit);
		
		if (weapon === null) {
			return false;
		}
		
		indexArray = IndexArray.createIndexArray(targetUnit.getMapX(), targetUnit.getMapY(), weapon);
		
		return IndexArray.findPos(indexArray, x, y);
	}
};

var WandChecker = {
	isWandUsable: function(unit) {
		var i, item;
		var count = UnitItemControl.getPossessionItemCount(unit);
		
		for (i = 0; i < count; i++) {
			item = UnitItemControl.getItem(unit, i);
			if (item !== null) {
				if (this.isWandUsableInternal(unit, item)) {
					return true;
				}
			}
		}
		
		return false;
	},
	
	isWandUsableInternal: function(unit, wand) {
		var obj;
		
		if (!wand.isWand()) {
			return false;
		}
		
		if (!ItemControl.isItemUsable(unit, wand)) {
			return false;
		}
		
		obj = ItemPackageControl.getItemAvailabilityObject(wand);
		if (obj === null) {
			return false;
		}
		
		return obj.isItemAvailableCondition(unit, wand);
	}
};

var ClassChangeChecker = {
	getClassEntryArray: function(unit, isMapCall) {
		var classGroup;
		var classGroupId = this.getClassGroupId(unit, isMapCall);
		var classEntryArray = [];
		
		classGroup = this.getClassGroup(classGroupId);
		if (classGroup !== null) {
			classEntryArray = ClassChangeChecker.createClassEntryArray(unit, classGroup);
		}
		
		return classEntryArray;
	},
	
	createClassEntryArray: function(unit, classGroup) {
		var i, data, classEntry;
		var classEntryArray = [];
		var count = classGroup.getClassGroupEntryCount();
		
		for (i = 0; i < count; i++) {
			data = classGroup.getClassGroupEntryData(i);
			
			classEntry = StructureBuilder.buildMultiClassEntry();
			classEntry.cls = data.getClass();
			classEntry.isChange = this.isClassChange(unit, data);
			
			if (classEntry.isChange) {
				classEntry.name = data.getClass().getName();
			}
			else {
				classEntry.name = StringTable.HideData_Question;
			}
			
			classEntryArray.push(classEntry);
		}
		
		return classEntryArray;
	},
	
	isClassChange: function(unit, data) {
		return data.isGlobalSwitchOn() && this._checkUnitParameter(unit, data);
	},
	
	getClassGroup: function(classGroupId) {
		var i, classGroup;
		var list = root.getBaseData().getClassGroupList();
		var count = list.getCount();
		
		for (i = 0; i < count; i++) {
			classGroup = list.getData(i);
			if (classGroup.getId() === classGroupId) {
				return classGroup;
			}
		}
		
		return null;
	},
	
	getClassGroupId: function(unit, isMapCall) {
		var classGroupId;
		
		if (unit.getClassUpCount() === 0) {
			// 一度もクラスチェンジしていない場合は、クラスグループ1を使用
			classGroupId = unit.getClassGroupId1();
		}
		else {
			// クラスチェンジしたことがある場合は、クラスグループ2を使用
			classGroupId = unit.getClassGroupId2();
		}
		
		// isMapCallがtrueの場合は、クラスチェンジアイテムでクラスチェンジが行われたことを意味する。
		// isMapCallがfalseの場合は、戦闘準備画面のクラスチェンジコマンドから行われたことを意味する。
		if (isMapCall && DataConfig.isBattleSetupClassChangeAllowed()) {
			// クラスチェンジアイテムによるクラスチェンジであり、
			// さらに戦闘準備画面のクラスチェンジも許可されている場合は、
			// クラスチェンジ回数を問わず、クラスグループ2を参照する。
			classGroupId = unit.getClassGroupId2();
		}
		
		return classGroupId;
	},
	
	_checkUnitParameter: function(unit, data) {
		var i, count, n, ou;
		
		// HPから体格までのパラメータとレベル
		count = ParamType.COUNT + 1;
		for (i = 0; i < count; i++) {
			n = data.getParameterValue(i);
			ou = data.getConditionValue(i);
			if (ou !== OverUnderType.NONE) {
				if (!this._checkOverUnder(this._getUnitValue(unit, i), n, ou)) {
					return false;
				}
			}
		}
		
		return true;
	},
	
	_getUnitValue: function(unit, index) {
		if (index === 0) {
			return unit.getLv();
		}
		else { 
			return unit.getParamValue(index - 1);
		}
	},
	
	_checkOverUnder: function(srcValue, destValue, ou) {
		var result = false;
		
		if (ou === OverUnderType.EQUAL) {
			if (srcValue === destValue) {
				result = true;
			}
		}
		else if (ou === OverUnderType.OVER) {
			if (srcValue >= destValue) {
				result = true;
			}
		}
		else if (ou === OverUnderType.UNDER) {
			if (srcValue < destValue) {
				result = true;
			}
		}
		
		return result;
	}
};

var LayoutControl = {
	getMapAnimationPos: function(x, y, animeData) {
		var x2, y2, size;
		
		if (typeof animeData === 'undedined') {
			x2 = x - 80;
			y2 = y - 110;
		}
		else {
			size = Miscellaneous.getFirstKeySpriteSize(animeData, 0);
			x2 = x - (Math.floor(size.width / 2) - 16);
			y2 = y - (Math.floor(size.height / 2) - 16) - 30;
		}
		
		return createPos(x2, y2);
	},
	
	getPixelX: function(x) {
		return (x * GraphicsFormat.MAPCHIP_WIDTH) - root.getCurrentSession().getScrollPixelX();
	},
	
	getPixelY: function(y) {
		return (y * GraphicsFormat.MAPCHIP_HEIGHT) - root.getCurrentSession().getScrollPixelY();
	},
	
	getCenterX: function(max, width) {
		var x;
	
		if (max === -1) {
			max = root.getGameAreaWidth();
		}
		
		if (max < width) {
			return 0;
		}
		
		x = max - width;
		x = Math.floor(x / 2);
		
		return x;
	},
	
	getCenterY: function(max, height) {
		var y;
		
		if (max === -1) {
			max = root.getGameAreaHeight();
		}
		
		if (max < height) {
			return 0;
		}
		
		y = max - height;
		y = Math.floor(y / 2);
		
		return y;
	},
	
	getRelativeX: function(div) {
		return Math.floor(root.getGameAreaWidth() / div);
	},
	
	getRelativeY: function(div) {
		return Math.floor(root.getGameAreaHeight() / div);
	},
	
	getObjectVisibleCount: function(div, maxCount) {
		var height = root.getGameAreaHeight() - 170;
		var count = Math.floor(height / div);
		
		if (maxCount !== -1) {
			if (count > maxCount) {
				count = maxCount;
			}
		}
		
		return count;
	},
	
	getNotifyY: function() {
		return this.getRelativeY(5);
	},
	
	getUnitBaseX: function(unit, width) {
		var x = LayoutControl.getPixelX(unit.getMapX()) + 32;
		
		return this._getNormalizeX(x, width, 0);
	},
	
	getUnitBaseY: function(unit, height) {
		var  y = LayoutControl.getPixelY(unit.getMapY()) + 40;
		
		return this._getNormalizeY(y, height, 60);
	},
	
	getUnitCenterX: function(unit, width, dx) {
		var xCenter = LayoutControl.getPixelX(unit.getMapX()) + 16;
		var x = xCenter - Math.floor(width / 2);
		
		return this._getNormalizeX(x, width, dx);
	},
	
	_getNormalizeX: function(x, width, dx) {
		return this._getNormalizeValue(x, width, root.getGameAreaWidth(), dx);
	},
	
	_getNormalizeY: function(y, height, dy) {
		return this._getNormalizeValue(y, height, root.getGameAreaHeight(), dy);
	},
	
	_getNormalizeValue: function(value, plusValue, maxValue, adjustment) {
		if (value + plusValue > maxValue) {
			value = maxValue -  plusValue - adjustment;
		}
		
		if (value < 0) {
			value = adjustment; 
		}
		
		return value;
	}
};

var UnitProvider = {
	// ユニットがマップに登場する際に呼ばれる
	setupFirstUnit: function(unit) {
	},
	
	sortSortieUnit: function() {
		var i;
		var unit = null;
		var list = PlayerList.getMainList();
		var count = list.getCount();
		
		function exchangeUnit(index) {
			var j, targetUnit;
		
			for (j = index; j >= 0; j--) {
				targetUnit = list.getData(j);
				// 前方の出撃済みユニットを追い越さない
				if (targetUnit.getSortieState() === SortieType.SORTIE) {
					break;
				}
				list.exchangeUnit(unit, targetUnit);
			}
		}
		
		for (i = 0; i < count; i++) {
			unit = list.getData(i);
			if (unit.getSortieState() === SortieType.SORTIE) {
				exchangeUnit(i - 1);
			}
		}
	},
	
	recoveryPlayerList: function() {
		var i, unit;
		var list = PlayerList.getMainList();
		var count = list.getCount();
		
		for (i = 0; i < count; i++) {
			unit = list.getData(i);
			this.recoveryUnit(unit);
			// フュージョン解除後に実行
			this._resetPos(unit);
		}
	},
	
	recoveryUnit: function(unit) {
		this._resetHp(unit);
		this._resetInjury(unit);
		this._resetState(unit);
		this._resetSortieState(unit);
		this._resetUnitState(unit);
		this._resetUnitStyle(unit);
	},
	
	recoveryPrepareUnit: function(unit) {
		this._resetHp(unit);
		this._resetInjury(unit);
		this._resetState(unit);
		this._resetUnitState(unit);
		this._resetUnitStyle(unit);
	},
	
	_resetHp: function(unit) {
		// HPを全回復させる
		unit.setHp(ParamBonus.getMhp(unit));
	},
	
	_resetInjury: function(unit) {
		// 負傷状態である場合は、ここで元に戻る
		if (unit.getAliveState() === AliveType.INJURY) {
			unit.setAliveState(AliveType.ALIVE);
		}
		
		// 負傷許可状態を既定にする
		unit.setInjury(root.getMetaSession().getDifficulty().getDifficultyOption() & DifficultyFlag.INJURY);
	},
	
	_resetState: function(unit) {
		// ユニットのステートを解除
		StateControl.arrangeState(unit, null, IncreaseType.ALLRELEASE);
	},
	
	_resetSortieState: function(unit) {
		// 非出撃状態に設定
		unit.setSortieState(SortieType.UNSORTIE);
	},
	
	_resetUnitState: function(unit) {
		// 待機状態を解除
		unit.setWait(false);
		
		// 不死身状態を解除
		unit.setImmortal(false);
		
		// 非表示状態を解除
		unit.setInvisible(false);
		
		// バッドステートガードを解除
		unit.setBadStateGuard(false);
	},
	
	_resetUnitStyle: function(unit) {
		FusionControl.clearFusion(unit);
		MetamorphozeControl.clearMetamorphoze(unit);
	},
	
	_resetPos: function(unit) {
		unit.setMapX(0);
		unit.setMapY(0);
	}
};

var Miscellaneous = {
	isCriticalAllowed: function(active, passive) {
		var option = root.getMetaSession().getDifficulty().getDifficultyOption();
		
		// クリティカルが既定で有効ではなく、
		// さらにunitがクリティカルスキルを持っていない場合は発動しない。
		if (!(option & DifficultyFlag.CRITICAL) && SkillControl.getBattleSkill(active, passive, SkillType.CRITICAL) === null) {
			return false;
		}
		
		return true;
	},
	
	isInjuryAllowed: function(unit) {
		// ゲストユニットは負傷を許可しない
		if (unit.isGuest()) {
			return false;
		}
		
		return unit.isInjury();
	},
	
	isExperienceEnabled: function(unit, exp) {
		// 習得経験値がない場合は続行しない
		if (exp <= 0) {
			return false;
		}
		
		if (unit === null) {
			return false;
		}
		
		// 最高レベルに達している場合は続行しない
		if (unit.getLv() === Miscellaneous.getMaxLv(unit)) { 
			return false;
		}
		
		return true;
	},
	
	isStealEnabled: function(unit, targetUnit, value) {
		if (value & StealFlag.SPEED) {
			// 速さ判定が有効な場合は、相手の速さ以上でなければ盗めない
			return ParamBonus.getSpd(unit) >= ParamBonus.getSpd(targetUnit);
		}
		
		return true;
	},
	
	isStealTradeDisabled: function(unit, item, value) {
		if (!(value & StealFlag.WEAPON) && item.isWeapon()) {
			// 武器を考慮しないにも関わらず、対象が武器の場合は交換できない
			return true;
		}
		
		if (value & StealFlag.WEIGHT) {
			if (ParamBonus.getStr(unit) < item.getWeight()) {
				// 重さ判定が有効な場合は、ユニットの力がアイテムの重さを下回る場合は無効
				return true;
			}
		}
		
		return this.isTradeDisabled(unit, item);
	},
	
	isTradeDisabled: function(unit, item) {
		if (item === null) {
			return false;
		}
		
		return item.isTradeDisabled();
	},
	
	isItemAccess: function(unit) {
		if (!unit.isGuest()) {
			return true;
		}
		
		// ユニットがゲストの場合は、増減が許可されているか調べる
		return DataConfig.isGuestTradeEnabled();
	},
	
	isDurabilityChangeAllowed: function(item, targetItem) {
		var type, itemType;
		
		if (item === null || targetItem === null) {
			return true;
		}
		
		if (!targetItem.isWeapon()) {
			// 「耐久変化」アイテムに対して、「耐久変化」は許可されない
			itemType = targetItem.getItemType();
			if (itemType === ItemType.DURABILITY) {
				return false;
			}
		}
			
		// 使用アイテムの耐久の種類を取得
		type = item.getDurabilityInfo().getDurabilityChangeType();
		if (type === DurabilityChangeType.HALF || type === DurabilityChangeType.BREAK) {
			// 「半分」及び「破壊」は重要アイテムを対象にできない
			if (targetItem.isImportance()) {
				return false;
			}
		}
		
		return true;
	},
	
	isPlayerFreeAction: function(unit) {
		return unit.getUnitType() === UnitType.PLAYER && root.getCurrentSession().isMapState(MapStateType.PLAYERFREEACTION);
	},
	
	isPhysicsBattle: function(weapon) {
		var weaponCategoryType = weapon.getWeaponCategoryType();
		var isPhysics;
		
		if (weaponCategoryType === WeaponCategoryType.PHYSICS || weaponCategoryType === WeaponCategoryType.SHOOT) {
			if (weapon.isReverseWeapon()) {
				isPhysics = false;
			}
			else {
				isPhysics = true;
			}
		}
		else {
			if (weapon.isReverseWeapon()) {
				isPhysics = true;
			}
			else {
				isPhysics = false;
			}
		}
		
		return isPhysics;
	},
	
	isStockAccess: function(unit) {
		var cls = unit.getClass();
		
		return cls.getClassOption() & ClassOptionFlag.STOCK;
	},
	
	isGameAcceleration: function() {
		return InputControl.isCancelState();
	},
	
	isSingleTextSpace: function(text) {	
		var c = text.charCodeAt(0);
		
		return (c < 256 || (c >= 0xff61 && c <= 0xff9f));
	},
	
	// 後のバージョンで削除
	isPairKeyItem: function(item) {
		return KeyEventChecker.isPairKey(item);
	},
	
	isUnitSrcPriority: function(unitSrc, unitDest) {
		var srcType = unitSrc.getUnitType();
		var destType = unitDest.getUnitType();
		
		// リアル戦闘時で自軍を右に表示し、PosMenuで自軍を左に表示するための判定を行う。
		// 下記の法則に従うことにより、自軍は位置表示が優先される。
		
		// 自軍 > 敵軍
		// 自軍 > 同盟軍
		// 同盟軍 > 敵軍
		
		// 自軍 vs 敵軍において、unitSrcが自軍でunitDestが敵軍のケースと、
		// unitDestが自軍でunitSrcが敵軍のケースがある。
		// unitSrcを優先位置に表示させる場合はtrueを返し、
		// unitDestを優先位置に表示させる場合はfalseを返す。
		
		if (srcType === UnitType.PLAYER) {
			// unitSrc優先
			return true;
		}
		else if (srcType === UnitType.ALLY) {
			if (destType === UnitType.PLAYER) {
				// unitDest優先
				return false;
			}
			else {
				return true;
			}
		}
		else if (srcType === UnitType.ENEMY) {
			if (destType === UnitType.PLAYER) {
				// unitDest優先
				return false;
			}
			else if (destType === UnitType.ALLY) {
				// unitDest優先
				return false;
			}
			else {
				return true;
			}
		}
		
		// この処理は実行されない
		return true;
	},
	
	getDyamicWindowY: function(unit, targetUnit, baseHeight) {
		var i, y, yLine, height, yCeneter;
		var d = LayoutControl.getRelativeY(6) - 40;
		var range = [,,,];
		var space = [,,,];
		
		if (unit === null || targetUnit === null) {
			return 0;
		}
		
		height = baseHeight;
		yCeneter = root.getGameAreaHeight() / 2;
		
		// ウインドウが上に配置されるケース
		range[0] = 0;
		space[0] = d;
		
		// ウインドウが下に配置されるケース
		range[1] = root.getGameAreaHeight() - height;
		space[1] = -d;
		
		// ウインドウが中央に配置されるケース(よほどキャラ同士が離れている場合に発生する)
		range[2] = yCeneter - (height / 2);
		space[2] = 0;
		
		for (i = 0; i < 3; i++) {
			y = LayoutControl.getPixelY(unit.getMapY());
			
			// 範囲内にユニットがいる場合は、ウインドウとかぶってしまうため、処理を続行しない
			if (range[i] <= y && range[i] + height + space[i] >= y) {
				continue;
			}
			
			y = LayoutControl.getPixelY(targetUnit.getMapY());
			
			if (range[i] <= y && range[i] + height + space[i] >= y) {
				continue;
			}
			
			break;
		}
		
		yLine = range[i] + space[i];
		
		return yLine;
	},
	
	getColorWindowTextUI: function(unit) {
		var textui;
		var unitType = unit.getUnitType();
		
		if (unitType === UnitType.PLAYER) {
			textui = root.queryTextUI('player_window');
		}
		else if (unitType === UnitType.ENEMY) {
			textui = root.queryTextUI('enemy_window');
		}
		else {
			textui = root.queryTextUI('partner_window');
		}
		
		return textui;
	},
	
	getMaxLv: function(unit) {
		var cls = unit.getClass();
		var lv = cls.getMaxLv();
		
		if (lv === -1) {
			lv = DataConfig.getMaxLv();
		}
		
		return lv;
	},
	
	getMotionColorIndex: function(unit) {
		var colorIndex;
		var motionColor = this.getOriginalMotionColor(unit);
		var unitType = unit.getUnitType();
		
		// 0は既定を意味する
		if (motionColor === 0) {
			if (unitType === UnitType.PLAYER) {
				colorIndex = 0;
			}
			else if (unitType === UnitType.ENEMY) {
				// -aを参照
				colorIndex = 1;
			}
			else {
				// -bを参照
				colorIndex = 2;
			}
		}
		else {
			// -c以降を参照
			colorIndex = motionColor + 2;
		}
		
		return colorIndex;
	},
	
	getOriginalMotionColor: function(unit) {
		return unit.getOriginalMotionColor();
	},
	
	// 後のバージョンで削除
	setupFirstUnit: function(unit) {
		UnitProvider.setupFirstUnit(unit);
	},
	
	changeClass: function(unit, newClass) {
		unit.setClass(newClass);
	},
	
	// 後のバージョンで削除
	recoveryUnit: function(unit) {
		UnitProvider.recoveryUnit(unit);
	},
	
	// 後のバージョンで削除
	recoveryPlayerList: function() {
		UnitProvider.recoveryPlayerList();
	},
	
	// 後のバージョンで削除
	getNearbyPos: function(unit, targetUnit) {
		return PosChecker.getNearbyPos(unit, targetUnit);
	},
	
	getRandomBackgroundHandle: function() {
		var isRuntime = false;
		var list, count, graphicsIndex, colorIndex, pic, graphicsId;
		
		// 最初にオリジナル背景を調べる
		list = root.getBaseData().getGraphicsResourceList(GraphicsType.EVENTBACK, isRuntime);
		count = list.getCount();
		if (count === 0) {
			isRuntime = true;
			list = root.getBaseData().getGraphicsResourceList(GraphicsType.EVENTBACK, isRuntime);
			count = list.getCount();
		}
		
		graphicsIndex = root.getRandomNumber() % count;
		
		// 0、1、2(朝、夕、夜)のいずれかの色を取得
		colorIndex = root.getRandomNumber() % 3;
		
		pic = list.getCollectionData(graphicsIndex, colorIndex);
		if (pic !== null) {
			graphicsId = pic.getId();
		}
		else {
			colorIndex = 0;
			pic = list.getCollectionData(graphicsIndex, colorIndex);
			if (pic !== null) {
				graphicsId = pic.getId();
			}
			else {
				graphicsId = list.getCollectionData(0, 0).getId();
			}
		}
		
		return root.createResourceHandle(isRuntime, graphicsId, colorIndex, 0, 0);
	},
	
	convertSpeedType: function(speedType) {
		var speed;
		
		if (speedType === SpeedType.DIRECT) {
			speed = 6;
		}
		else if (speedType === SpeedType.SUPERHIGH) {
			speed = 5;
		}
		else if (speedType === SpeedType.HIGH) {
			speed = 4;
		}
		else if (speedType === SpeedType.NORMAL) {
			speed = 3;
		}
		else if (speedType === SpeedType.LOW) {
			speed = 2;
		}
		else {
			speed = 1;
		}
		
		return speed;
	},
	
	// 後のバージョンで削除
	getRealBattleWeapon: function(unit) {
		return BattlerChecker.getRealBattleWeapon(unit);
	},
	
	// 後のバージョンで削除
	getRealBattleClass: function(unit, weapon) {
		return BattlerChecker.getRealBattleWeapon(unit, weapon);
	},
	
	// 後のバージョンで削除
	findBattleAnime: function(cls, weapon) {
		return BattlerChecker.findBattleAnime(cls, weapon);
	},
	
	// 後のバージョンで削除
	findAttackTemplateType: function(cls, weapon) {
		return BattlerChecker.findAttackTemplateType(cls, weapon);
	},
	
	// サイズはGraphicsFormat.EFFECT_WIDTHなどで表現できるが、
	// スプライトが拡大/縮小されている場合があるため、明示的に取得する。
	// 最初のフレームが拡大/縮小されているならば、後続のフレームも同じサイズであると仮定している。
	getFirstKeySpriteSize: function(effectAnimeData, motionId) {
		var frameIndex, spriteIndex;
		var effectWidth = GraphicsFormat.EFFECT_WIDTH;
		var effectHeight = GraphicsFormat.EFFECT_HEIGHT;
		
		if (effectAnimeData !== null) {
			frameIndex = 0;
			spriteIndex = effectAnimeData.getSpriteIndexFromType(motionId, frameIndex, SpriteType.KEY);
			effectWidth = effectAnimeData.getSpriteWidth(motionId, frameIndex, spriteIndex);
			effectHeight = effectAnimeData.getSpriteHeight(motionId, frameIndex, spriteIndex);
		}
		
		return {
			width: effectWidth,
			height: effectHeight
		};
	},
	
	convertAIValue: function(value) {
		var limitHp = DataConfig.getMaxParameter(0);
			
		// 命中率が0から100の範囲に収まることに対し、武器の威力の基準はゲームによって異なる。
		// なるべく、命中率と同じ基準値にするべく、そのゲームの限界HPを調べることで威力を調整している。
		if (limitHp < 100) {
			value *= 6;
		}
		else if (limitHp < 500) {
			value *= 1;
		}
		else if (limitHp < 1000) {
			value /= 2;
		}
		else {
			value /= 5;
		}
		
		return value;
	},
	
	// 後のバージョンで削除
	sortSortieUnit: function() {
		UnitProvider.sortSortieUnit();
	},
	
	isPrepareScene: function() {
		var scene = root.getBaseScene();
		
		return scene === SceneType.BATTLESETUP || scene === SceneType.REST;
	},
	
	changeHpBonus: function(unit, mhpPrev) {
		var mhpNew, curHp, value;
		
		mhpNew = ParamBonus.getMhp(unit);
		
		// ユニットの最大HPでなく、現在のHPを取得
		curHp = unit.getHp();
		
		// クラスチェンジによって増減した最大HPの差分を取得
		value = mhpNew - mhpPrev;
		if (value > 0) {
			// 増減した分だけ現在HPを増加
			unit.setHp(curHp + value);
		}
		else if (curHp > mhpNew) {
			// 現在HPが最大HPを超過しているため、現在HPを最大HPに設定
			unit.setHp(mhpNew);
		}
	}
};
