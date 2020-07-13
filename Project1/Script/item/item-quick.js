
var QuickItemSelection = defineObject(BaseItemSelection,
{
	isPosSelectable: function() {
		var unit = this._posSelector.getSelectorTarget(true);
		
		if (unit === null) {
			return false;
		}
		
		// 再度行動アイテムの対象になるユニットは、待機状態でなければならない
		return unit.isWait();
	}
}
);

var QuickItemUse = defineObject(BaseItemUse,
{
	_itemUseParent: null,
	
	enterMainUseCycle: function(itemUseParent) {
		this._itemUseParent = itemUseParent;
		
		this.mainAction();
		
		return EnterResult.OK;
	},
	
	mainAction: function() {
		var targetUnit = this._itemUseParent.getItemTargetInfo().targetUnit;
		
		targetUnit.setWait(false);
		
		// 行動済みを解除することで、敵ターンで動けるようにする
		targetUnit.setOrderMark(OrderMarkType.FREE);
	},
	
	getItemAnimePos: function(itemUseParent, animeData) {
		return this.getUnitBasePos(itemUseParent, animeData);
	}
}
);

var QuickItemInfo = defineObject(BaseItemInfo,
{
	drawItemInfoCycle: function(x, y) {
		ItemInfoRenderer.drawKeyword(x, y, this.getItemTypeName(StringTable.ItemInfo_Quick));
		
		y += ItemInfoRenderer.getSpaceY();
		this.drawRange(x, y, this._item.getRangeValue(), this._item.getRangeType());
	},
	
	getInfoPartsCount: function() {
		return 2;
	}
}
);

var QuickItemAvailability = defineObject(BaseItemAvailability,
{
	isItemAllowed: function(unit, targetUnit, item) {
		// 待機していないユニットは、対象にならない
		return targetUnit.isWait();
	}
}
);

var QuickItemAI = defineObject(BaseItemAI,
{
	getItemScore: function(unit, combination) {
		if (!combination.targetUnit.isWait()) {
			return AIValue.MIN_SCORE;
		}
		
		// レベルの高いユニットほど再行動の対象になる
		return combination.targetUnit.getLv() * 7;
	}
}
);
