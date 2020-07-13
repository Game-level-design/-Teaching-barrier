
// ユニットリストを取得する時点で判定を行う。
// ユニットリストからユニットを取得する度に生存などの判定は行わない。
// DefaultListメソッドは、フュージョンされているユニットを考慮する。
var AllUnitList = {
	getAliveList: function(list) {
		var funcCondition = function(unit) {
			return unit.getAliveState() === AliveType.ALIVE && FusionControl.getFusionParent(unit) === null;
		};
		
		return this.getList(list, funcCondition);
	},
	
	getAliveDefaultList: function(list) {
		var funcCondition = function(unit) {
			return unit.getAliveState() === AliveType.ALIVE;
		};
		
		return this.getList(list, funcCondition);
	},
	
	getDeathList: function(list) {
		var funcCondition = function(unit) {
			return unit.getAliveState() === AliveType.DEATH;
		};
		
		return this.getList(list, funcCondition);
	},
	
	getSortieList: function(list) {
		var funcCondition = function(unit) {
			return unit.getSortieState() === SortieType.SORTIE && unit.getAliveState() === AliveType.ALIVE && FusionControl.getFusionParent(unit) === null;
		};
		
		return this.getList(list, funcCondition);
	},
	
	getSortieDefaultList: function(list) {
		var funcCondition = function(unit) {
			return unit.getSortieState() === SortieType.SORTIE && unit.getAliveState() === AliveType.ALIVE;
		};
		
		return this.getList(list, funcCondition);
	},
	
	getSortieOnlyList: function(list) {
		var funcCondition = function(unit) {
			return unit.getSortieState() === SortieType.SORTIE;
		};
		
		return this.getList(list, funcCondition);
	},
	
	getList: function(list, funcCondition) {
		var i, unit, obj;
		var arr = [];
		var count = list.getCount();
		
		for (i = 0; i < count; i++) {
			unit = list.getData(i);
			if (funcCondition(unit)) {
				arr.push(unit);
			}
		}
		
		obj = StructureBuilder.buildDataList();
		obj.setDataArray(arr);
		
		return obj;
	}
};

var PlayerList = {
	getAliveList: function() {
		return AllUnitList.getAliveList(this.getMainList());
	},
	
	getAliveDefaultList: function() {
		return AllUnitList.getAliveDefaultList(this.getMainList());
	},
	
	getDeathList: function() {
		return AllUnitList.getDeathList(this.getMainList());
	},
	
	getSortieList: function() {
		return AllUnitList.getSortieList(this.getMainList());
	},
	
	getSortieDefaultList: function() {
		return AllUnitList.getSortieDefaultList(this.getMainList());
	},
	
	getSortieOnlyList: function() {
		return AllUnitList.getSortieOnlyList(this.getMainList());
	},
	
	getMainList: function() {
		return root.getMetaSession().getTotalPlayerList();
	}
};

var EnemyList = {
	getAliveList: function() {
		return AllUnitList.getAliveList(this.getMainList());
	},
	
	getAliveDefaultList: function() {
		return AllUnitList.getAliveDefaultList(this.getMainList());
	},
	
	getDeathList: function() {
		return AllUnitList.getDeathList(this.getMainList());
	},
	
	getMainList: function() {
		return root.getCurrentSession().getEnemyList();
	}
};

var AllyList = {
	getAliveList: function() {
		return AllUnitList.getAliveList(this.getMainList());
	},
	
	getAliveDefaultList: function() {
		return AllUnitList.getAliveDefaultList(this.getMainList());
	},
	
	getDeathList: function() {
		return AllUnitList.getDeathList(this.getMainList());
	},
	
	getMainList: function() {
		return root.getCurrentSession().getAllyList();
	}
};

var TurnControl = {
	turnEnd: function() {
		if (root.getCurrentScene() === SceneType.FREE) {
			SceneManager.getActiveScene().turnEnd();
		}
	},
	
	getActorList: function() {
		var list = null;
		var turnType = root.getCurrentSession().getTurnType();
		
		if (turnType === TurnType.PLAYER) {
			list = PlayerList.getSortieList();
		}
		else if (turnType === TurnType.ENEMY) {
			list = EnemyList.getAliveList();
		}
		else if (turnType === TurnType.ALLY) {
			list = AllyList.getAliveList();
		}
		
		return list;
	},
	
	getTargetList: function() {
		var list = null;
		var turnType = root.getCurrentSession().getTurnType();
		
		if (turnType === TurnType.PLAYER) {
			list = EnemyList.getAliveList();
		}
		else if (turnType === TurnType.ENEMY) {
			list = PlayerList.getSortieList();
		}
		else if (turnType === TurnType.ALLY) {
			list = EnemyList.getAliveList();
		}
		
		return list;
	}
};

var FilterControl = {
	getNormalFilter: function(unitType) {
		var filter = 0;
		
		if (unitType === UnitType.PLAYER) {
			filter = UnitFilterFlag.PLAYER;
		}
		else if (unitType === UnitType.ENEMY) {
			filter = UnitFilterFlag.ENEMY;
		}
		else if (unitType === UnitType.ALLY) {
			filter = UnitFilterFlag.ALLY;
		}
		
		return filter;
	},

	getReverseFilter: function(unitType) {
		var filter = 0;
		
		if (unitType === UnitType.PLAYER) {
			filter = UnitFilterFlag.ENEMY;
		}
		else if (unitType === UnitType.ENEMY) {
			filter = UnitFilterFlag.PLAYER | UnitFilterFlag.ALLY;
		}
		else if (unitType === UnitType.ALLY) {
			filter = UnitFilterFlag.ENEMY;
		}
		
		return filter;
	},
	
	getBestFilter: function(unitType, filterFlag) {
		var newFlag = 0;
		
		if (unitType === UnitType.ENEMY) {
			if (filterFlag & UnitFilterFlag.PLAYER) {
				newFlag |= UnitFilterFlag.ENEMY;
			}
			if (filterFlag & UnitFilterFlag.ENEMY) {
				newFlag |= UnitFilterFlag.PLAYER | UnitFilterFlag.ALLY;
			}
			
			filterFlag = newFlag;
		}
		
		return filterFlag;
	},
	
	getListArray: function(filter) {
		var listArray = [];
		
		if (filter & UnitFilterFlag.PLAYER) {
			listArray.push(PlayerList.getSortieList());
		}
		
		if (filter & UnitFilterFlag.ENEMY) {
			listArray.push(EnemyList.getAliveList());
		}
		
		if (filter & UnitFilterFlag.ALLY) {
			listArray.push(AllyList.getAliveList());
		}
		
		return listArray;	
	},
	
	getAliveListArray: function(filter) {
		var listArray = [];
		
		if (filter & UnitFilterFlag.PLAYER) {
			listArray.push(PlayerList.getAliveList());
		}
		
		if (filter & UnitFilterFlag.ENEMY) {
			listArray.push(EnemyList.getAliveList());
		}
		
		if (filter & UnitFilterFlag.ALLY) {
			listArray.push(AllyList.getAliveList());
		}
		
		return listArray;	
	},
	
	getDeathListArray: function(filter) {
		var listArray = [];
		
		if (filter & UnitFilterFlag.PLAYER) {
			listArray.push(PlayerList.getDeathList());
		}
		
		if (filter & UnitFilterFlag.ENEMY) {
			listArray.push(EnemyList.getDeathList());
		}
		
		if (filter & UnitFilterFlag.ALLY) {
			listArray.push(AllyList.getDeathList());
		}
		
		return listArray;	
	},
	
	isUnitTypeAllowed: function(unit, targetUnit) {
		var unitType = unit.getUnitType();
		var targetUnitType = targetUnit.getUnitType();
		
		if (unitType === UnitType.PLAYER) {
			return targetUnitType === UnitType.PLAYER;
		}
		else if (unitType === UnitType.ENEMY) {
			return targetUnitType === UnitType.ENEMY;
		}
		else if (unitType === UnitType.ALLY) {
			return targetUnitType === UnitType.ALLY;
		}
		
		return false;
	},
	
	isReverseUnitTypeAllowed: function(unit, targetUnit) {
		var unitType = unit.getUnitType();
		var targetUnitType = targetUnit.getUnitType();
		
		if (unitType === UnitType.PLAYER) {
			return targetUnitType === UnitType.ENEMY;
		}
		else if (unitType === UnitType.ENEMY) {
			return targetUnitType === UnitType.PLAYER || targetUnitType === UnitType.ALLY;
		}
		else if (unitType === UnitType.ALLY) {
			return targetUnitType === UnitType.ENEMY;
		}
		
		return false;
	},
	
	isBestUnitTypeAllowed: function(unitType, targetUnitType, filterFlag) {
		filterFlag = this.getBestFilter(unitType, filterFlag);
		
		if ((filterFlag & UnitFilterFlag.PLAYER) && (targetUnitType === UnitType.PLAYER)) {
			return true;
		}
		
		if ((filterFlag & UnitFilterFlag.ALLY) && (targetUnitType === UnitType.ALLY)) {
			return true;
		}
		
		if ((filterFlag & UnitFilterFlag.ENEMY) && (targetUnitType === UnitType.ENEMY)) {
			return true;
		}
		
		return false;
	}
};
