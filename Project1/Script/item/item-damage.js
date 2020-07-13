
var DamageItemSelection = defineObject(BaseItemSelection,
{
}
);

var DamageItemUse = defineObject(BaseItemUse,
{
	_dynamicEvent: null,
	
	enterMainUseCycle: function(itemUseParent) {
		var generator;
		var itemTargetInfo = itemUseParent.getItemTargetInfo();
		var damageInfo = itemTargetInfo.item.getDamageInfo();
		var type = itemTargetInfo.item.getRangeType();
		var plus = Calculator.calculateDamageItemPlus(itemTargetInfo.unit, itemTargetInfo.targetUnit, itemTargetInfo.item);
		
		this._dynamicEvent = createObject(DynamicEvent);
		generator = this._dynamicEvent.acquireEventGenerator();
		
		if (type !== SelectionRangeType.SELFONLY) {
			generator.locationFocus(itemTargetInfo.targetUnit.getMapX(), itemTargetInfo.targetUnit.getMapY(), true);
		}
		
		generator.damageHit(itemTargetInfo.targetUnit, this._getItemDamageAnime(itemTargetInfo),
			damageInfo.getDamageValue() + plus, damageInfo.getDamageType(), itemTargetInfo.unit, itemUseParent.isItemSkipMode());
		
		return this._dynamicEvent.executeDynamicEvent();
	},
	
	moveMainUseCycle: function() {
		return this._dynamicEvent.moveDynamicEvent();
	},
	
	_getItemDamageAnime: function(itemTargetInfo) {
		return itemTargetInfo.item.getItemAnime();
	}
}
);

var DamageItemInfo = defineObject(BaseItemInfo,
{
	drawItemInfoCycle: function(x, y) {
		ItemInfoRenderer.drawKeyword(x, y, this.getItemTypeName(StringTable.ItemInfo_Damage));
		y += ItemInfoRenderer.getSpaceY();
		
		this._drawValue(x, y);
		y += ItemInfoRenderer.getSpaceY();
		
		this._drawInfo(x, y);
	},
	
	getInfoPartsCount: function() {
		return 3;
	},
	
	_drawValue: function(x, y) {
		var damageInfo = this._item.getDamageInfo();
		
		ItemInfoRenderer.drawKeyword(x, y, StringTable.Damage_Pow);
		x += ItemInfoRenderer.getSpaceX();
		NumberRenderer.drawRightNumber(x, y, damageInfo.getDamageValue());
		
		x += 40;
		this.drawRange(x, y, this._item.getRangeValue(), this._item.getRangeType());
	},
	
	_drawInfo: function(x, y) {
		var text;
		var damageInfo = this._item.getDamageInfo();
		var damageType = damageInfo.getDamageType();
		var textui = this.getWindowTextUI();
		var color = textui.getColor();
		var font = textui.getFont();
		
		if (damageType === DamageType.FIXED) {
			text = StringTable.DamageType_Fixed;
		}
		else if (damageType === DamageType.PHYSICS) {
			text = StringTable.DamageType_Physics;
		}
		else {
			text = StringTable.DamageType_Magic;
		}
			
		ItemInfoRenderer.drawKeyword(x, y, StringTable.DamageType_Name);
		x += ItemInfoRenderer.getSpaceX();
		TextRenderer.drawKeywordText(x, y, text, -1, color, font);
	}
}
);

var DamageItemAvailability = defineObject(BaseItemAvailability,
{
}
);

var DamageItemAI = defineObject(BaseItemAI,
{
	getItemScore: function(unit, combination) {
		var score;
		var isDeath = false;
		var hp = combination.targetUnit.getHp();
		var damage = this._getValue(unit, combination);
		
		hp -= damage;
		if (hp <= 0) {
			isDeath = true;
		}
		
		score = Miscellaneous.convertAIValue(damage);
		
		// 相手を倒せる場合は、優遇する
		if (isDeath) {
			score += 50;
		}
		
		// 必中という点を考慮
		score += 15;
		
		return score;
	},
	
	_getValue: function(unit, combination) {
		var plus = Calculator.calculateDamageItemPlus(unit, combination.targetUnit, combination.item);
		var damageInfo = combination.item.getDamageInfo();
		
		return Calculator.calculateDamageValue(combination.targetUnit, damageInfo.getDamageValue(), damageInfo.getDamageType(), plus);
	}
}
);
