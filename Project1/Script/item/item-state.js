
var StateItemSelection = defineObject(BaseItemSelection,
{
}
);

var StateItemUse = defineObject(BaseItemUse,
{
	_dynamicEvent: null,
	
	enterMainUseCycle: function(itemUseParent) {
		var generator;
		var itemTargetInfo = itemUseParent.getItemTargetInfo();
		var info = itemTargetInfo.item.getStateInfo();
		
		this._dynamicEvent = createObject(DynamicEvent);
		generator = this._dynamicEvent.acquireEventGenerator();
		generator.unitStateAddition(itemTargetInfo.targetUnit, info.getStateInvocation(), IncreaseType.INCREASE, itemTargetInfo.unit, itemUseParent.isItemSkipMode());
		
		return this._dynamicEvent.executeDynamicEvent();
	},
	
	moveMainUseCycle: function() {
		return this._dynamicEvent.moveDynamicEvent();
	}
}
);

var StateItemInfo = defineObject(BaseItemInfo,
{
	drawItemInfoCycle: function(x, y) {
		ItemInfoRenderer.drawKeyword(x, y, this.getItemTypeName(StringTable.ItemInfo_State));
		y += ItemInfoRenderer.getSpaceY();
		this.drawRange(x, y, this._item.getRangeValue(), this._item.getRangeType());
		y += ItemInfoRenderer.getSpaceY();
		this._drawValue(x, y);
	},
	
	getInfoPartsCount: function() {
		return 3;
	},
	
	_drawValue: function(x, y) {
		var stateInvocation = this._item.getStateInfo().getStateInvocation();
		var state = stateInvocation.getState();
		var text = InvocationRenderer.getInvocationText(stateInvocation.getInvocationValue(), stateInvocation.getInvocationType());
		var textui = this.getWindowTextUI();
		var color = textui.getColor();
		var font = textui.getFont();
		
		TextRenderer.drawKeywordText(x, y, state.getName() + ' ' + text, -1, color, font);
	}
}
);

var StateItemAvailability = defineObject(BaseItemAvailability,
{
}
);

var StateItemAI = defineObject(BaseItemAI,
{
	getItemScore: function(unit, combination) {
		var stateInvocation = combination.item.getStateInfo().getStateInvocation();
		var state = stateInvocation.getState();
		var score = StateScoreChecker.getScore(unit, combination.targetUnit, state);
		
		if (score < 0) {
			return score;
		}
		
		return score + combination.targetUnit.getLv();
	}
}
);

var StateScoreChecker = {
	getScore: function(unit, targetUnit, state) {
		var option, flag, data, recoveryValue;
		var score = -1;
		
		if (StateControl.isStateBlocked(targetUnit, unit, state)) {
			// 相手に対してそのステートを与えれない場合は、アイテムを使用しない
			return -1;
		}
		
		if (StateControl.getTurnState(targetUnit, state) !== null) {
			// 相手が既にそのステートを与えられている場合は、アイテムを使用しない
			return -1;
		}
		
		recoveryValue = state.getAutoRecoveryValue();
		if (recoveryValue !== 0) {
			score += Math.abs(recoveryValue);
		}
		
		option = state.getBadStateOption();
		flag = state.getBadStateFlag();
		
		data = this._getFlagData(targetUnit, flag);
		if (flag & BadStateFlag.PHYSICS) {
			if (data.physics > 0) {
				// 物理攻撃ができる場合は、物理攻撃禁止が考慮される
				score += 5;
			}
		}
		if (flag & BadStateFlag.MAGIC) {
			if (data.magic > 0) {
				score += 5;
			}
		}
		if (flag & BadStateFlag.ITEM) {
			if (data.item > 0) {
				score += 5;
			}
		}
		if (flag & BadStateFlag.WAND) {
			if (data.wand > 0) {
				score += 5;
			}
		}
		
		if (option === BadStateOption.NOACTION) {
			score += 15;
		}
		else if (option === BadStateOption.BERSERK) {
			score += 25;
		}
		
		return score + this._getDopingValue(state);
	},
	
	_getFlagData: function(unit, flag) {
		var i, item;
		var count = UnitItemControl.getPossessionItemCount(unit);
		var data = {
			physics: 0,
			magic: 0,
			item: 0,
			wand: 0
		};
		
		for (i = 0; i < count; i++) {
			item = UnitItemControl.getItem(unit, i);
			
			if (flag & BadStateFlag.PHYSICS) {
				if (ItemControl.isWeaponAvailable(unit, item) && item.getWeaponCategoryType() !== WeaponCategoryType.MAGIC) {
					data.physics++;
				}
			}
			if (flag & BadStateFlag.MAGIC) {
				if (ItemControl.isWeaponAvailable(unit, item) && item.getWeaponCategoryType() === WeaponCategoryType.MAGIC) {
					data.magic++;
				}
			}
			if (flag & BadStateFlag.ITEM) {
				if (ItemControl.isItemUsable(unit, item)) {
					data.item++;
				}
			}
			if (flag & BadStateFlag.WAND) {
				if (ItemControl.isItemUsable(unit, item) && item.isWand()) {
					data.wand++;
				}
			}
		}
		
		return data;
	},
	
	_getDopingValue: function(state) {
		var i;
		var value = 0;
		var count = ParamGroup.getParameterCount();
		
		for (i = 0; i < count; i++) {
			value += Math.abs(ParamGroup.getDopingParameter(state, i));
		}
		
		return value;
	}
};
