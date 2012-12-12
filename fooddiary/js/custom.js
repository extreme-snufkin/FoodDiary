/*
 * Title   : Food Diary
 * 
 * Version : 2.1 (2012/11/12)
 * Author  : Tohru Mashiko
 * License : Copyright (c) 2012 Tohru Mashiko
 *           <a href="http://www.opensource.org/licenses/mit-license.php">The MIT License</a>
 *           ※The copyright holder of jQuery Mobile DateBox, please refer to the following site.
 *             https://github.com/jtsage/jquery-mobile-datebox
 */
//------------------------------------------------------------
//fooddiaryオブジェクト
//------------------------------------------------------------
var fooddiary = function() {
	//------------------------------------------------------------
	//定数プロパティ
	//------------------------------------------------------------
	//IndexedDBオブジェクト
	this.INDEXEDDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB;
	//トランザクションオブジェクト(Android版Chrome時に必要となる定数)
	this.IDBTRANSACTON = window.IDBTransaction || window.webkitIDBTransaction;
	//リスト数
	this.LISTCOUNT = 3;
	//------------------------------------------------------------
	//変数プロパティ
	//------------------------------------------------------------
	//IndexedDBオブジェクト
	this.fdDB = null;
	//ObjectStoreオブジェクト
	this.objectStore = null;
	//Android版Chromeフラグ
	this.acFlag = false;
	//BrowserErrerフラグ
	this.beFlag = false;
	//タッチロックフラグ
	this.touchFlag = false;
	//ボタンロックフラグ
	this.btnFlag = false;
	//foodオブジェクト格納配列
	this.foodList = null;
};
//------------------------------------------------------------
//fooddiaryオブジェクト メソッド宣言
//------------------------------------------------------------
fooddiary.prototype = {
	//------------------------------------------------------------
	//現在のYYYY/MM/DD取得処理(共通)
	//------------------------------------------------------------
	getYYYYMMDD : function() {
		console.log('getYYYYMMDD Start');
		var nowDate = new Date();
		var nowYear = nowDate.getFullYear();
		var nowMonth = nowDate.getMonth() + 1;
		var nowDay = nowDate.getDate();
		var res = nowYear + '/' + this.zeroPadding(nowMonth, 2) + '/' + this.zeroPadding(nowDay, 2);
		console.log('getYYYYMMDD End');
		return res;
	},
	//------------------------------------------------------------
	//数字文字列の指定桁数での先頭0埋め処理(共通)
	//------------------------------------------------------------
	zeroPadding : function(num, keta) {
		console.log('zeroPadding Start');
		//パラメータ省略時、デフォルト2桁
		keta = keta || 2;
		//0文字生成
		var zero = '';
		for (var ct = 0; ct < keta; ct++) {
			zero = zero + '0';
		}
		//0文字埋め
		var res = (zero + num).slice(-keta);
		console.log('zeroPadding End');
		return res;
	},
	//------------------------------------------------------------
	//指定年月日を1日増減する処理(共通)
	//------------------------------------------------------------
	swipeDay : function(date, flag) {
		console.log('swipeDay Start');
		var arrDate = date.split('/', 3);
		var numYear = new Number(arrDate[0]);
		var numMonth = new Number(arrDate[1]);
		var numDay = new Number(arrDate[2]);
		var targetDate = new Date(numYear + '/' + numMonth + '/' + numDay);
		var baseSec = targetDate.getTime();
		if (flag === 'plus') {
			targetSec = baseSec + 86400000;
		} else {
			targetSec = baseSec - 86400000;
		}
		var newDate = new Date();
		newDate.setTime(targetSec);
		var newYear = newDate.getFullYear();
		var newMonth = newDate.getMonth() + 1;
		var newDay = newDate.getDate();
		var res = newYear + '/' + this.zeroPadding(newMonth, 2) + '/' + this.zeroPadding(newDay, 2);
		console.log('swipeDay End');
		return res;
	},
	//------------------------------------------------------------
	//食事リストの表示処理(daily-list用)
	//------------------------------------------------------------
	dispFoodList : function(yyyymmdd) {
		console.log('dispFoodList Start');
		$.mobile.loadingMessage = 'データ読込中';
		$.mobile.loadingMessageTextVisible = true;
		$.mobile.showPageLoadingMsg();
		//食事リスト初期セット
		var nowInstance = this;
		nowInstance.initFoodList()
		//食事リスト読み込み非同期内部関数
		var readFoodList = function () {
			console.log('dispFoodList readFoodList Start');
			//リストデータ作成読み込み処理(非同期)
			nowInstance.foodList = new Array(nowInstance.LISTCOUNT);
			for (var ct = 0; ct < nowInstance.LISTCOUNT; ct++) {
				var targetKey = yyyymmdd + '/' + ct;
				nowInstance.foodList[ct] = new food();
				nowInstance.foodList[ct].setKey(targetKey);
				nowInstance.foodList[ct].readFoodData(nowInstance);
			}
			var asyncReadIDB = window.setInterval(
				function () {
					if (nowInstance.foodList != null) {
						//リスト呼び出しカウント
						var returnCount = 0;
						//エラーカウント
						var errorCount = 0;
						//X件分の読み込み処理完了判断
						for (var ct = 0; ct < nowInstance.LISTCOUNT; ct++) {
							if (nowInstance.foodList[ct].getStatus() !== 0) {
								returnCount++;
								if (nowInstance.foodList[ct].getStatus() === 2) {
									errorCount++;
								}
							}
						}
						if (returnCount === nowInstance.LISTCOUNT) {
							if (errorCount > 0) {
								alert('データの読み込みに失敗しました。');
							}
							//データベースオープン処理のタイマー監視解除
							clearInterval(asyncReadIDB);
							//リストデータの画面更新処理
							nowInstance.setOneDaysFoodList(nowInstance.foodList);
							//food配列オブジェクト開放
							nowInstance.foodList = null;
							//ダイアログを停止
							$.mobile.hidePageLoadingMsg();
						}
					} else {
						//画面情報読み込み中に遷移処理等が行われた際の無限ループ防止
						//データベースオープン処理のタイマー監視解除
						console.log('dispFoodList readFoodList 無限ループ防止');
						clearInterval(asyncReadIDB);
					}
				},
				100
			);
			console.log('dispFoodList readFoodList End');
		};
		if (nowInstance.beFlag == false) {
			//データベースのオープン確認
			if (!nowInstance.fdDB) {
				//データベースがオープンしていない場合
				//データベースオープン処理(非同期)
				var foodObj = new food();
				foodObj.openIndexedDB(nowInstance);
				var asyncOpenIDB = window.setInterval(
					function () {
						if (foodObj != null) {
							if (foodObj.getStatus() === 1) {
								//データベースオープン処理のタイマー監視解除
								clearInterval(asyncOpenIDB);
								//foodオブジェクト開放
								foodObj = null;
								//食事リスト読み込み非同期内部関数コール
								readFoodList();
							} else if (foodObj.getStatus() === 2) {
								alert('IndexedDBのオープン時にエラーが発生しました。');
								//データベースオープン処理のタイマー監視解除
								clearInterval(asyncOpenIDB);
								//foodオブジェクト開放
								foodObj = null;
								//ダイアログを停止
								$.mobile.hidePageLoadingMsg();
							}
						} else {
							//画面情報読み込み中に遷移処理等が行われた際の無限ループ防止
							//データベースオープン処理のタイマー監視解除
							console.log('dispFoodList 無限ループ防止');
							clearInterval(asyncOpenIDB);
						}
					},
					100
				);
			} else {
				//データベースがオープンしている場合
				//食事リスト読み込み非同期内部関数コール
				readFoodList();
			}
		} else {
			//ブラウザエラー時はダイアログを停止
			$.mobile.hidePageLoadingMsg();
		}
		console.log('dispFoodList End');
	},
	//------------------------------------------------------------
	//食事リストの表示処理(daily-list用)
	//------------------------------------------------------------
	initFoodList : function() {
		console.log('initFoodList Start');
		//食事リスト要素削除
		$('li.targetfood').remove();
		//食事リスト初期セット
		for (var ct = 0; ct < this.LISTCOUNT; ct++) {
			var childElement = '';
			childElement = '<li data-inset="true" data-theme="d" class="targetfood">';
			childElement = childElement + '<a href="#daily-save-type" data-ajax="false" style="-webkit-touch-callout: none;">';
			childElement = childElement + '<img class="foodimg" id="foodimg' + ct + '" src="images/noimage.png" style="max-width:88px;max-height:66px;top:8px;left:0;" />';
			childElement = childElement + '<h3 class="foodname" id="foodname' + ct + '">未登録</h3>';
			childElement = childElement + '<p class="foodtype" id="foodtype' + ct + '">－－－</p>';
			childElement = childElement + '<input type="hidden" name="fdosid" class="fdosid" id="fdosid' + ct + '" value="0" />';
			childElement = childElement + '</a>';
			childElement = childElement + '</li>';
			$('#foodlist').append(childElement);
		}
		$('#foodlist').listview('refresh');
		console.log('initFoodList End');
	},
	//------------------------------------------------------------
	//食事リストのデータセット処理(daily-list用)
	//------------------------------------------------------------
	setOneDaysFoodList : function(foodlist) {
		console.log('setOneDaysFoodList Start');
		for (var ct = 0; ct < this.LISTCOUNT; ct++) {
			if (foodlist[ct].getKey() != '') {
				//写真
				if (!(foodlist[ct].getFile() == null || foodlist[ct].getFile() == "")) {
					$('#foodimg' + ct).attr('src', foodlist[ct].getFile());
				}
				//料理名
				$('#foodname' + ct).text(foodlist[ct].getName());
				//食事の種類
				if (foodlist[ct].getType() == 0) {
					$('#foodtype' + ct).text('内食');
				} else {
					$('#foodtype' + ct).text('外食/中食');
				}
				//fdosIDの設定
				$('#fdosid' + ct).val(foodlist[ct].getKey());
			}
		}
		//食事リスト更新
		$('#foodlist').listview('refresh');
		console.log('setOneDaysFoodList End');
	},
	//------------------------------------------------------------
	//食事データの削除処理(daily-list用)
	//------------------------------------------------------------
	deleteFoodList : function(yyyymmdd, targetKey) {
		console.log('deleteFoodList Start');
		$.mobile.loadingMessage = 'データ削除中';
		$.mobile.loadingMessageTextVisible = true;
		$.mobile.showPageLoadingMsg();
		var nowInstance = this;
		if (nowInstance.beFlag == false) {
			//リストデータ削除処理(非同期)
			var foodObj = new food();
			foodObj.setKey(targetKey);
			foodObj.deleteFoodData(nowInstance);
			var asyncDeleteIDB = window.setInterval(
				function () {
					if (foodObj != null) {
						if (foodObj.getStatus() !== 0) {
							if (foodObj.getStatus() === 2) {
								alert('データの削除時にエラーが発生しました。');
							}
							//データベース削除処理のタイマー監視解除
							clearInterval(asyncDeleteIDB);
							//foodオブジェクト開放
							foodObj = null;
							//ダイアログを停止
							$.mobile.hidePageLoadingMsg();
							//食事リストの表示処理
							nowInstance.dispFoodList(yyyymmdd);
						}
					} else {
						//更新中に遷移処理等が行われた際の無限ループ防止
						//データベース削除処理のタイマー監視解除
						console.log('deleteFoodList 無限ループ防止');
						clearInterval(asyncDeleteIDB);
					}
				},
				100
			);
		} else {
			//ブラウザエラー時はダイアログを停止
			$.mobile.hidePageLoadingMsg();
		}
		console.log('deleteFoodList End');
	},
	//------------------------------------------------------------
	//緯度･経度取得処理(daily-save-type用)
	//------------------------------------------------------------
	getGeolocation : function() {
		console.log('getGeolocation Start');
		var nowInstance = this;
		//Geolocation APIの使用判定
		if (!navigator.geolocation) {
			console.warn('getGeolocation 現在のブラウザでは、ジオロケーションは使用できません。');
			alert('現在のブラウザでは、ジオロケーションは使用できません。');
			return;
		}
		//位置情報取得
		navigator.geolocation.getCurrentPosition(function (position) {
			//緯度取得
			$('#latitude').val(position.coords.latitude);
			//経度取得
			$('#longitude').val(position.coords.longitude);
			console.log('緯度：' + $('#latitude').val() + '\n経度：' + $('#longitude').val());
			//google MAPS作成処理
			nowInstance.dispMaps();
		}, function (err) {
			// エラーの場合
			console.error('getGeolocation ジオロケーション取得エラー：' + err.code);
			if (err.code === 1) {
				alert('ジオロケーションの取得時にエラーが発生しました。\n受け渡しを拒否したか、オフライン環境の為、エラーとなりました。');
			} else {
				alert('ジオロケーション取得エラー：' + err.code);
			}
		},{
			//詳細な位置を返すように設定
			enableHighAccuracy: true
		});
		console.log('getGeolocation End');
	},
	//------------------------------------------------------------
	//google Maps作成処理(daily-save-type用)
	//------------------------------------------------------------
	dispMaps : function() {
		console.log('dispMaps Start');
		//地図初期化
		if ($('#map') != null) {
			$('#map').remove();
		}
		//地図の緯度経度設定
		var mapPosition = new google.maps.LatLng($('#latitude').val(), $('#longitude').val());
		//地図表示枠作成
		$('#map-wrapper').append("<div id='map' style='width:100%;height:250px'></div>");
		//地図サイズ設定
		var mapOptions = {
			zoom:17,
			center:mapPosition,
			mapTypeId:google.maps.MapTypeId.ROADMAP
		};
		//地図作成(divのmap要素をIDセレクタにて取得できない)
		var map = new google.maps.Map(document.getElementById('map'), mapOptions);
		//地図上にマーカー設定
		new google.maps.Marker({ map: map, position: mapPosition });
		console.log('dispMaps End');
	},
	//------------------------------------------------------------
	//食事の種類変更時の再描画処理(daily-save-type用)
	//------------------------------------------------------------
	dispFoodType : function() {
		console.log('dispFoodType Start');
		//食事の種類
		if ($('#radio-foodtype-1').is(':checked')) {
			//内食が選択されている場合
			//所要時間ラベル
			$("#timeneededlabel").toggle(true);
			//所要時間
			$("#timeneeded").toggle(true);
			//レシピラベル
			$("#recipelabel").toggle(true);
			//レシピの情報
			$("#recipe").toggle(true);
			//店名ラベル
			$("#shopnamelabel").toggle(false);
			//店名
			$("#shopname").toggle(false);
		} else {
			//外食/中食が選択されている場合
			//所要時間ラベル
			$("#timeneededlabel").toggle(false);
			//所要時間
			$("#timeneeded").toggle(false);
			//レシピラベル
			$("#recipelabel").toggle(false);
			//レシピの情報
			$("#recipe").toggle(false);
			//店名ラベル
			$("#shopnamelabel").toggle(true);
			//店名
			$("#shopname").toggle(true);
		}
		console.log('dispFoodType End');
	},
	//------------------------------------------------------------
	//入力チェック処理(daily-save-type用)
	//------------------------------------------------------------
	inputValueCheck : function() {
		console.log('inputValueCheck Start');
		var resMsg =  '';
		//料理名
		if ($('#foodname').val().length > 20) {
			console.warn('料理名は20文字以内で入力してください。');
			resMsg = resMsg + '\n料理名は20文字以内で入力してください。';
		}
		//所要時間
		if ($('#timeneeded').val().length > 10) {
			console.warn('所要時間は10文字以内で入力してください。');
			resMsg = resMsg + '\n所要時間は10文字以内で入力してください。';
		}
		//1食あたりの予算
		if ($('#cost').val().length > 20) {
			console.warn('1食あたりの予算は20文字以内で入力してください。');
			resMsg = resMsg + '\n1食あたりの予算は20文字以内で入力してください。';
		}
		//レシピ情報
		if ($('#recipe').val().length > 256) {
			console.warn('レシピ情報は256文字以内で入力してください。');
			resMsg = resMsg + '\nレシピ情報は256文字以内で入力してください。';
		}
		//店名
		if ($('#shopname').val().length > 20) {
			console.warn('店名は20文字以内で入力してください。');
			resMsg = resMsg + '\n店名は20文字以内で入力してください。';
		}
		if (resMsg != "") {
			alert(resMsg);
			console.log('inputValueCheck End(1)');
			return false;
		} else {
			console.log('inputValueCheck End(2)');
			return true;
		}
	},
	//------------------------------------------------------------
	//画面項目初期化処理(daily-save-type用)
	//------------------------------------------------------------
	clearDST : function() {
		console.log('clearDST Start');
		//image表示部初期化
		$('#camPhoto').attr('src', 'images/noimage_large.png');
		//imageパスの初期化
		$('#camData').replaceWith("<input type='file' id='camData' class='camData' accept='image/*;capture=camera'>");
		//食事の種類
		$('#radio-foodtype-1').attr('checked', true).checkboxradio('refresh');
		$('#radio-foodtype-2').attr('checked', false).checkboxradio('refresh');
		//食事の種類変更時の再描画処理
		this.dispFoodType();
		//料理名
		$('#foodname').val('');
		//所要時間
		$('#timeneeded').val('');
		//１食あたりの予算
		$('#cost').val('');
		//レシピの情報
		$('#recipe').val('');
		//店名
		$('#shopname').val('');
		//緯度
		$('#latitude').val('');
		//経度
		$('#longitude').val('');
		//地図
		if ($('#map') != null) {
			$('#map').remove();
		}
		console.log('clearDST End');
	},
	//------------------------------------------------------------
	//食事データの表示処理(daily-save-type用)
	//------------------------------------------------------------
	dispFood : function (targetKey) {
		console.log('dispFood Start');
		$.mobile.loadingMessage = 'データ読込中';
		$.mobile.loadingMessageTextVisible = true;
		$.mobile.showPageLoadingMsg();
		var nowInstance = this;
		//食事データ読み込み非同期内部関数
		var readFoodOne = function () {
			console.log('dispFood readFoodOne Start');
			var foodReadObj = new food();
			foodReadObj.setKey(targetKey);
			foodReadObj.readFoodData(nowInstance);
			var asyncReadIDB = window.setInterval(
				function () {
					if (foodReadObj != null) {
						if (foodReadObj.getStatus() !== 0) {
							//データベースオープン処理のタイマー監視解除
							clearInterval(asyncReadIDB);
							if (foodReadObj.getStatus() === 2) {
								alert('データの読み込みに失敗しました。');
							} else {
								//食事データの画面更新処理
								nowInstance.setOneFood(foodReadObj);
							}
							//foodオブジェクト開放
							foodReadObj = null;
							//保存ボタンロック解除設定
							nowInstance.btnFlag = false;
							//ダイアログを停止
							$.mobile.hidePageLoadingMsg();
						}
					} else {
						//画面情報読み込み中に遷移処理等が行われた際の無限ループ防止
						//データベースオープン処理のタイマー監視解除
						console.log('dispFood readFoodOne 無限ループ防止');
						clearInterval(asyncReadIDB);
					}
				},
				100
			);
			console.log('dispFood readFoodOne End');
		};
		if (nowInstance.beFlag == false) {
			//データベースのオープン確認
			if (!nowInstance.fdDB) {
				//データベースがオープンしていない場合
				//データベースオープン処理(非同期)
				var foodObj = new food();
				foodObj.openIndexedDB(nowInstance);
				var asyncOpenIDB = window.setInterval(
					function () {
						if (foodObj != null) {
							if (foodObj.getStatus() === 1) {
								//データベースオープン処理のタイマー監視解除
								clearInterval(asyncOpenIDB);
								//foodオブジェクト開放
								foodObj = null;
								//食事データ読み込み非同期内部関数コール
								readFoodOne();
							} else if (foodObj.getStatus() === 2) {
								alert('IndexedDBのオープン時にエラーが発生しました。');
								//データベースオープン処理のタイマー監視解除
								clearInterval(asyncOpenIDB);
								//foodオブジェクト開放
								foodObj = null;
								//保存ボタンロック解除設定
								nowInstance.btnFlag = false;
								//ダイアログを停止
								$.mobile.hidePageLoadingMsg();
							}
						} else {
							//画面情報読み込み中に遷移処理等が行われた際の無限ループ防止
							//データベースオープン処理のタイマー監視解除
							console.log('dispFood 無限ループ防止');
							clearInterval(asyncOpenIDB);
						}
					},
					100
				);
			} else {
				//データベースがオープンしている場合
				//食事データ読み込み非同期内部関数コール
				readFoodOne();
			}
		} else {
			//保存ボタンロック解除設定
			nowInstance.btnFlag = false;
			//ブラウザエラー時はダイアログを停止
			$.mobile.hidePageLoadingMsg();
		}
		console.log('dispFood End');
	},
	//------------------------------------------------------------
	//食事データセット処理(daily-save-type用)
	//------------------------------------------------------------
	setOneFood : function (foodObj) {
		console.log('setOneFood Start');
		if (foodObj.getKey() != '') {
			//写真
			if (!(foodObj.getFile() == null || foodObj.getFile() == '')) {
				$('#camPhoto').attr('src', foodObj.getFile());
			}
			$('#camData')[0].files[0] = null;
			//食事の種類
			if (foodObj.getType() == 0) {
				$('#radio-foodtype-1').attr('checked', true).checkboxradio('refresh');
				$('#radio-foodtype-2').attr('checked', false).checkboxradio('refresh');
			} else {
				$('#radio-foodtype-1').attr('checked', false).checkboxradio('refresh');
				$('#radio-foodtype-2').attr('checked', true).checkboxradio('refresh');
			}
			//食事の種類変更時の再描画処理
			this.dispFoodType();
			//料理名
			$('#foodname').val(foodObj.getName());
			//所要時間
			$('#timeneeded').val(foodObj.getTimeneeded());
			//１食あたりの予算
			$('#cost').val(foodObj.getCost());
			//レシピの情報
			$('#recipe').val(foodObj.getRecipe());
			//店名
			$('#shopname').val(foodObj.getShopName());
			//緯度
			$('#latitude').val(foodObj.getLat());
			//経度
			$('#longitude').val(foodObj.getLon());
			//地図
			this.dispMaps();
		}
		console.log('setOneFood End');
	},
	//------------------------------------------------------------
	//食事データの更新準備処理(daily-save-type用)
	//------------------------------------------------------------
	preparationUpdateFood : function() {
		console.log('preparationUpdateFood Start');
		$.mobile.loadingMessage = 'データ更新中';
		$.mobile.loadingMessageTextVisible = true;
		$.mobile.showPageLoadingMsg();
		var nowInstance = this;
		if (nowInstance.beFlag == false) {
			//食事データの更新処理
			nowInstance.updateFood($('#camPhoto').attr('src'));
		} else {
			//ブラウザエラー時はダイアログを停止
			$.mobile.hidePageLoadingMsg();
		}
		console.log('preparationUpdateFood End');
	},
	//------------------------------------------------------------
	//食事データの更新処理(daily-save-type用)
	//------------------------------------------------------------
	updateFood : function(imgURL) {
		console.log('updateFood Start');
		var nowInstance = this;
		//リストデータ更新処理(非同期)
		var foodObj = new food();
		//更新対象キー(年月日とリスト番号)
		var targetKey = $('#date').val() + '/' + $('#listno').val();
		foodObj.setKey(targetKey);
		//食事の種類
		if ($('#radio-foodtype-1').is(':checked')) {
			foodObj.setType(0);
		} else {
			foodObj.setType(1);
		}
		//料理名
		foodObj.setName($('#foodname').val());
		//所要時間
		foodObj.setTimeneeded($('#timeneeded').val());
		//１食あたりの予算
		foodObj.setCost($('#cost').val());
		//レシピの情報
		foodObj.setRecipe($('#recipe').val());
		//店名
		foodObj.setShopName($('#shopname').val());
		//緯度
		foodObj.setLat($('#latitude').val());
		//経度
		foodObj.setLon($('#longitude').val());
		//画像ファイル
		foodObj.setFile(imgURL);
		foodObj.updateFoodData(nowInstance);
		var asyncUpdateIDB = window.setInterval(
			function () {
				if (foodObj != null) {
					if (foodObj.getStatus() !== 0) {
						if (foodObj.getStatus() === 2) {
							alert('データの更新時にエラーが発生しました。');
						}
						//データベース更新処理のタイマー監視解除
						clearInterval(asyncUpdateIDB);
						//foodオブジェクト開放
						foodObj = null;
						//ダイアログを停止
						$.mobile.hidePageLoadingMsg();
						//食事データの表示処理
						nowInstance.dispFood(targetKey);
					}
				} else {
					//画面情報読み込み中に遷移処理等が行われた際の無限ループ防止
					//データベースオープン処理のタイマー監視解除
					console.log('updateFood 無限ループ防止');
					clearInterval(asyncUpdateIDB);
				}
			},
			100
		);
		console.log('updateFood End');
	}
};
//------------------------------------------------------------
//食事日記アプリケーションの初期化
//------------------------------------------------------------
var fooddiaryObj = new fooddiary();
//------------------------------------------------------------
//data-role="page" id="#daily-list" の画面処理
//------------------------------------------------------------
$(document).on('pageinit', '#daily-list', function (e) {
	//--------------------------------------------------
	//画面初期化処理
	//--------------------------------------------------
	console.log('pageinit daily-list Start');
	//ブラウザ判定
	console.info(navigator.userAgent);
	if (!(navigator.userAgent.indexOf('Firefox') > 1 || navigator.userAgent.indexOf('Chrome') > 1)) {
		console.warn('pageinit daily-list 現在のブラウザでは、当アプリケーションは正常に動作致しません。\n最新版のFirefoxか、Chromeをご使用下さい。');
		alert('現在のブラウザでは、当アプリケーションは正常に動作致しません。\n最新版のFirefoxか、Chromeをご使用下さい。');
		fooddiaryObj.beFlag = true;
	} else {
		//IndexedDBのオフライン使用判定
		if (!fooddiaryObj.INDEXEDDB) {
			console.warn('pageinit daily-list 現在の環境では正常に動作しないAPIを使用しております。\n最新版のブラウザでWebサーバを経由してご使用下さい。');
			alert('現在の環境では正常に動作しないAPIを使用しております。\n最新版のブラウザでWebサーバを経由してご使用下さい。');
			fooddiaryObj.beFlag = true;
		}
		//Android版Chrome判定
		if (navigator.userAgent.indexOf('Android') > 1 && navigator.userAgent.indexOf('Chrome') > 1) {
			fooddiaryObj.acFlag = true;
		}
	}
	$('#daily-list').on('pagebeforecreate', '#p-datebox', function (event) {
		//--------------------------------------------------
		//Dateboxの使用スイッチ
		//--------------------------------------------------
		console.log('pagebeforecreate p-datebox Start');
		var ua = navigator.userAgent;
		if (/(OS 4_[\d_]+ like Mac|Android|Windows Phone OS 7)/.test(ua) && !/CrMo/.test(ua)) {
			$('input[type=date]')
				.attr('data-role', 'datebox')
				.attr('data-options', '{"dateFormat": "YYYY/MM/DD", "fieldsOrderOverride": ["y", "m", "d"]}');
			$.getScript("http://dev.jtsage.com/cdn/datebox/latest/jquery.mobile.datebox.min.js", function (data, status) {
				$.getScript("http://dev.jtsage.com/cdn/datebox/i18n/jquery.mobile.datebox.i18n.ja.utf8.js", function (data, status) {
					$('#p-datebox').trigger('create');
				});
			});
		}
		console.log('pagebeforecreate p-datebox End');
	});
	$('#daily-list').on('change', '#date', function (event) {
		//--------------------------------------------------
		//年月日変更処理
		//--------------------------------------------------
		console.log('change date Start');
		//年月日を元にIndexedDBから画面情報の取得
		//食事リストの初期表示処理
		fooddiaryObj.dispFoodList($('#date').val());
		console.log('change date End');
	});
	$('#daily-list').on('tap', '.targetfood', function (event) {
		//--------------------------------------------------
		//リスト選択処理(タッチ)
		//--------------------------------------------------
		console.log('tap targetfood Start');
		fooddiaryObj.touchFlag = true;
		//年月日の受け渡し
		$('#selectYMD').val($('#date').val());
		//リスト番号の受け渡し
		$('#listno').val($('.targetfood').index(this));
		console.log('tap targetfood End');
	});
	$('#daily-list').on('taphold', '.targetfood', function (event) {
		//--------------------------------------------------
		//リスト選択処理(ロングタッチ)
		//--------------------------------------------------
		console.log('taphold targetfood Start');
		if (fooddiaryObj.touchFlag == false) {
			var delFlag = confirm($('.targetfood').index(this) + 1 + '番目のデータを削除します。');
			if (delFlag) {
				//削除処理＋リスト再表示処理
				fooddiaryObj.deleteFoodList($('#date').val(), $('#fdosid' + $('.targetfood').index(this)).val());
			}
		}
		//Android版Firefoxでは、taphold実行中にtapイベントが発生する為、
		//永久的にロックされてしまう事象の回避策
		fooddiaryObj.touchFlag = false;
		console.log('taphold targetfood End');
	});
	$('#daily-list').on('swiperight', function (event) {
		//--------------------------------------------------
		//右スワイプ処理
		//--------------------------------------------------
		console.log('swiperight daily-list Start');
		//年月日を－1日戻す
		$('#date').val(fooddiaryObj.swipeDay($('#date').val(), 'minus'));
		//食事リストの初期表示処理
		fooddiaryObj.dispFoodList($('#date').val());
		console.log('swiperight daily-list End');
	});
	$('#daily-list').on('swipeleft', function (event) {
		//--------------------------------------------------
		//左スワイプ処理
		//--------------------------------------------------
		console.log('swipeleft daily-list Start');
		//年月日を＋1日進める
		$('#date').val(fooddiaryObj.swipeDay($('#date').val(), 'plus'));
		//食事リストの初期表示処理
		fooddiaryObj.dispFoodList($('#date').val());
		console.log('swipeleft daily-list End');
	});
	console.log('pageinit daily-list End');
}).on('pagebeforeshow', '#daily-list', function (e, data) {
	//--------------------------------------------------
	//画面表示データ設定処理
	//--------------------------------------------------
	console.log('pagebeforeshow daily-list Start');
	fooddiaryObj.touchFlag = false;
	//食事登録画面の年月日の受け渡し
	if ($('#selectYMD').val() == null || $('#selectYMD').val() == '') {
		//DOMキャッシュが無い場合
		$('#date').val(fooddiaryObj.getYYYYMMDD());
	} else {
		//DOMキャッシュがある場合
		$('#date').val($('#selectYMD').val());
	}
	console.log('pagebeforeshow daily-list End');
}).on('pageshow', '#daily-list', function (event, data) {
	//--------------------------------------------------
	//画面表示データ読み込み処理
	//--------------------------------------------------
	console.log('pageshow daily-list Start');
	//データベースの読み込み処理
	//食事リストの初期表示処理
	fooddiaryObj.dispFoodList($('#date').val());
	console.log('pageshow daily-list End');
}).on('contextmenu', function (event) {
	//--------------------------------------------------
	//コンテキストメニュー防止対策(Android版Firefox用)
	//--------------------------------------------------
	console.log('contextmenu Start-End');
	return false;
});
//------------------------------------------------------------
//data-role="page" id="#daily-save-type" の画面処理
//------------------------------------------------------------
$(document).on('pageinit', '#daily-save-type', function (event) {
	//--------------------------------------------------
	//画面初期化処理
	//--------------------------------------------------
	console.log('pageinit daily-save-type Start');
	//保存ボタンロック設定
	fooddiaryObj.btnFlag = true;
	$('#daily-save-type').on('change', '#camData', function (event) {
		//--------------------------------------------------
		//カメラ画像取込処理
		//--------------------------------------------------
		console.log('change camData Start');
		var reader = new FileReader();
		reader.onload = function (evt) {
			$('#camPhoto').attr('src',reader.result);
		}
		var imageFile = $('#camData')[0].files[0];
		//ファイルをデータURLスキームデータとして読み込み実施
		reader.readAsDataURL(imageFile);
		//緯度･経度取得処理
		fooddiaryObj.getGeolocation();
		console.log('change camData End');
	});
	$('#daily-save-type').on('change', '.radio-foodtype', function (event) {
		//--------------------------------------------------
		//食事の種類変更処理
		//--------------------------------------------------
		console.log('change radio-foodtype Start');
		//食事の種類変更時の再描画処理
		fooddiaryObj.dispFoodType();
		console.log('change radio-foodtype End');
	});
	$('#daily-save-type').on('tap', '#savebtn', function (e) {
		//--------------------------------------------------
		//保存ボタンタッチ処理
		//--------------------------------------------------
		console.log('tap savebtn Start');
		//入力値チェック
		var res = fooddiaryObj.inputValueCheck();
		if (res == true && fooddiaryObj.btnFlag == false) {
			//IndexedDBの特定オブジェクト更新準備処理
			fooddiaryObj.btnFlag = true;
			fooddiaryObj.preparationUpdateFood();
		}
		console.log('tap savebtn End');
	});
	console.log('pageinit daily-save-type End');
}).on('pagebeforeshow', '#daily-save-type', function (event, data) {
	//--------------------------------------------------
	//画面表示データ初期化処理
	//--------------------------------------------------
	console.log('pagebeforeshow daily-save-type Start');
	//画面項目の初期化処理
	fooddiaryObj.clearDST();
	//画面遷移エラーチェック
	if ($('#selectYMD').val() == '' || $('#listno').val() == '') {
		console.warn('pagebeforeshow 最初の画面から当ページへ遷移して下さい。');
		alert('最初の画面から当ページへ遷移して下さい。');
		location.href = '#daily-list';
		console.log('pagebeforeshow daily-save-type End(1)');
		return
	}
	console.log('pagebeforeshow daily-save-type End(2)');
}).on('pageshow', '#daily-save-type', function (event, data) {
	//--------------------------------------------------
	//画面表示データ読み込み処理
	//--------------------------------------------------
	console.log('pageshow daily-save-type Start');
	//年月日とリスト番号を元にIndexedDBから画面情報の取得
	var targetKey = $('#selectYMD').val() + '/' + $('#listno').val();
	//IndexedDB読み込み処理
	fooddiaryObj.dispFood(targetKey);
	console.log('pageshow daily-save-type End');
});
