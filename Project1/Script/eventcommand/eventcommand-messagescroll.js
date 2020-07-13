
var MessageScrollEventCommand = defineObject(BaseEventCommand,
{
	_text: null,
	_scrollTextView: null,
	_isSkipAllowed: false,
	
	enterEventCommandCycle: function() {
		this._prepareEventCommandMemberData();
		
		if (!this._checkEventCommand()) {
			return EnterResult.NOTENTER;
		}
		
		return this._completeEventCommandMemberData();
	},
	
	moveEventCommandCycle: function() {
		if (this._isSkipAllowed && InputControl.isSelectAction()) {
			return MoveResult.END;
		}
		
		if (this._scrollTextView.moveScrollTextViewCycle() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawEventCommandCycle: function() {
		this._scrollTextView.drawScrollTextViewCycle();
	},
	
	isEventCommandSkipAllowed: function() {
		return this._isSkipAllowed;
	},
	
	_prepareEventCommandMemberData: function() {
		this._text = null;
		this._scrollTextView = createObject(ScrollTextView);
		
		this._checkSkipAction();
	},
	
	_checkEventCommand: function() {
		if (!this._isSkipAllowed) {
			return true;
		}
		
		return this.isEventCommandContinue();
	},
	
	_completeEventCommandMemberData: function() {
		var scrollTextParam;
		var eventCommandData = root.getEventCommandObject();
		var replacer = createObject(VariableReplacer);
		
		if (eventCommandData.isStaffRoll()) {
			this._text = replacer.startReplace(root.getConfigInfo().getStaffRollString());
		}
		else {
			this._text = replacer.startReplace(eventCommandData.getText());
		}
		
		// startReplaceの後で実行すること
		scrollTextParam = this._createScrollTextParam();
		
		this._scrollTextView.openScrollTextViewCycle(scrollTextParam);
		
		return EnterResult.OK;
	},
	
	_createScrollTextParam: function() {
		var eventCommandData = root.getEventCommandObject();
		var scrollTextParam = StructureBuilder.buildScrollTextParam();
		
		scrollTextParam.margin = 0;
		scrollTextParam.x = eventCommandData.getX();
		scrollTextParam.speedType = eventCommandData.getSpeedType();
		scrollTextParam.text = this._text;
		
		if (eventCommandData.isCenterShow()) {
			scrollTextParam.x = -1;	
		}
		
		return scrollTextParam;
	},
	
	_checkSkipAction: function() {
		var eventCommandData = root.getEventCommandObject();
		
		this._isSkipAllowed = !eventCommandData.isStaffRoll();
	}
}
);
