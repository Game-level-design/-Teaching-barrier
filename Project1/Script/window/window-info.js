
var InfoWindow = defineObject(BaseWindow,
{
	_message: null,
	_infoType: -1,
	_infoWidth: 0,
	_infoHeight: 0,
	_messagePager: null,
	_rowCount: 0,
	_charWidth: 0,
	_charHeight: 0,
	_spaceInterval: 0,
	
	setInfoMessage: function(message) {
		var messagePagerParam;
		
		this._setSize();
		this._calculateWindowSize(message);
		messagePagerParam = this._createMessagePagerParam();
		
		this._messagePager = createObject(MessagePager);
		this._messagePager.setMessagePagerInfo(messagePagerParam);
		this._messagePager.setMessagePagerText(message);
	},
	
	setInfoMessageAndType: function(message, infoType) {
		this._infoType = infoType;
		this.setInfoMessage(message, infoType);
	},
	
	moveWindowContent: function() {
		this._messagePager.moveMessagePager();
		
		if (InputControl.isSelectAction() || InputControl.isCancelAction()) {
			this._playCancelSound();
			return MoveResult.END;
		}
	
		return MoveResult.CONTINUE;
	},
	
	drawWindowContent: function(x, y) {
		this._messagePager.drawMessagePager(x, y);
	},
	
	getWindowWidth: function() {
		return this._infoWidth + (this.getWindowXPadding() * 2);
	},
	
	getWindowHeight: function() {
		return this._infoHeight + (this.getWindowYPadding() * 2);
	},
	
	getWindowTextUI: function() {
		var text = this._infoType === -1 ? 'default_window' : 'info_window';
		
		return root.queryTextUI(text);
	},
	
	getWindowTitleTextUI: function() {
		return root.queryTextUI('infowindow_title');
	},
	
	getWindowTitleText: function() {
		var text = '';
		
		if (this._infoType === InfoWindowType.INFORMATION) {
			text = StringTable.InfoWindow_Information;
		}
		else if (this._infoType === InfoWindowType.WARNING) {
			text = StringTable.InfoWindow_Warning;
		}
		
		return text;
	},
	
	_calculateWindowSize: function(message) {
		var i, c;
		var rowCount = 0;
		var width = 0;
		var maxWidth = 0;
		var length = message.length;
		
		for (i = 0; i < length; i++) {
			c = message.charAt(i);
			if (c === '\n') {
				if (width > maxWidth) {
					maxWidth = width;
				}
				
				// 次の行を調べるから初期化
				width = 0;
				
				// 一行調べたから増やす
				rowCount++;
				if (this._getMaxRowCount() === rowCount) {
					break;
				}
			}
			else {
				if (Miscellaneous.isSingleTextSpace(c)) {
					width += (Math.floor(this._charWidth / 2));
				}
				else {
					width += this._charWidth;
				}
			}
		}
		
		rowCount++;
		if (width > maxWidth) {
			maxWidth = width;
		}
		
		this._rowCount = rowCount;
		this._infoWidth = maxWidth;
		this._infoHeight = (rowCount * this._charHeight) + ((rowCount - 1) * this._spaceInterval);
	},
	
	_getMaxRowCount: function() {
		return 12;
	},
	
	_setSize: function() {
		var textui = this.getWindowTextUI();
		var size = textui.getFont().getSize();
		
		this._charWidth = size;
		this._charHeight = size;
		this._spaceInterval = 10;
	},
	
	_createMessagePagerParam: function() {
		var messagePagerParam = StructureBuilder.buildMessagePagerParam();
		var textui = this.getWindowTextUI();
		
		messagePagerParam.color = textui.getColor();
		messagePagerParam.font = textui.getFont();
		messagePagerParam.picUnderLine = null;
		messagePagerParam.maxWidth = this._infoWidth;
		messagePagerParam.rowCount = this._rowCount;
		messagePagerParam.interval = this._spaceInterval;
		
		return messagePagerParam;
	},
	
	_playCancelSound: function() {
	}
}
);
