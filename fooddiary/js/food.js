/*
 * Title   : Food Diary
 * 
 * Version : 2.2 (2012/11/28)
 * Author  : Tohru Mashiko
 * License : Copyright (c) 2012 Tohru Mashiko
 *           <a href="http://www.opensource.org/licenses/mit-license.php">The MIT License</a>
 *           ※The copyright holder of jQuery Mobile DateBox, please refer to the following site.
 *             https://github.com/jtsage/jquery-mobile-datebox
 */
//------------------------------------------------------------
//foodオブジェクト
//------------------------------------------------------------
var food = function() {
	//------------------------------------------------------------
	//定数プロパティ
	//------------------------------------------------------------
	//IndexedDB名
	this.DBFD = 'food_diary';
	//IndexedDB_オブジェクトストア名(テーブル)
	this.OSFD = 'fdos';
	//IndexedDBバージョン設定
	this.DBVER = 1;
	//IndexedDB_キーID(YYYY/MM/DD/N)
	this.KEYFD = 'ymdskey';
	//食事の種類
	this.TYPEFD = 'type';
	//料理名
	this.NAMEFD = 'name';
	//所要時間
	this.TIMENEEDEDFD = 'time';
	//1食あたりの予算
	this.COSTFD = 'cost';
	//レシピ情報
	this.RECIPEFD = 'recipe';
	//店名
	this.SHOPNAMEFD = 'shop';
	//緯度
	this.LATFD = 'lat';
	//経度
	this.LONFD = 'lon';
	//写真
	this.PHOTOFD = 'photo';
	//------------------------------------------------------------
	//変数プロパティ
	//------------------------------------------------------------
	//処理ステータス(0:処理中,1:完了,2:エラー)
	var _status = 0;
	//キー
	var _key = '';
	//食事の種類
	var _type = '';
	//料理名
	var _name = '';
	//所要時間
	var _timeneeded = '';
	//１食あたりの予算
	var _cost = '';
	//レシピの情報
	var _recipe = '';
	//店名
	var _shopname = '';
	//緯度
	var _lat = '';
	//経度
	var _lon = '';
	//ファイル
	var _file = '';
	//------------------------------------------------------------
	//変数アクセサ
	//------------------------------------------------------------
	//ステータス
	this.setStatus = function (status) { _status = status; }
	this.getStatus = function () { return _status; }
	//キー
	this.setKey = function(key) {_key = key;}
	this.getKey = function() {return _key;}
	//食事の種類
	this.setType = function(type) {_type = type;}
	this.getType = function() {return _type;}
	//料理名
	this.setName = function(name) {_name = name;}
	this.getName = function() {return _name;}
	//所要時間
	this.setTimeneeded = function(timeneeded) {_timeneeded = timeneeded;}
	this.getTimeneeded = function() {return _timeneeded;}
	//１食あたりの予算
	this.setCost = function (cost) { _cost = cost; }
	this.getCost = function () { return _cost; }
	//レシピの情報
	this.setRecipe = function (recipe) { _recipe = recipe; }
	this.getRecipe = function () { return _recipe; }
	//店名
	this.setShopName = function (shopname) { _shopname = shopname; }
	this.getShopName = function () { return _shopname; }
	//緯度
	this.setLat = function (lat) { _lat = lat; }
	this.getLat = function () { return _lat; }
	//経度
	this.setLon = function (lon) { _lon = lon; }
	this.getLon = function () { return _lon; }
	//写真ファイル
	this.setFile = function (file) { _file = file; }
	this.getFile = function () { return _file; }
}
//------------------------------------------------------------
//foodパッケージ メソッド宣言
//------------------------------------------------------------
food.prototype = {
	//------------------------------------------------------------
	//IndexedDBオープン処理
	//------------------------------------------------------------
	openIndexedDB : function (obj) {
		console.log('openIndexedDB Start');
		var nowInstance = this;
		nowInstance.setStatus(0);
		//データベースオープン処理
		var request = obj.INDEXEDDB.open(nowInstance.DBFD, nowInstance.DBVER);
		//DBオープンエラー時
		request.onerror = function (event) {
			//データベースがオープンしなかった場合
			console.error('openIndexedDB IndexedDBのオープンに失敗しました。: ' + event.target.errorCode);
			nowInstance.setStatus(2);
		}
		//DBアップグレード時 or 新規作成時(Firefoxでしか動作しないモジュール,Choromの場合、発生しないイベント)
		request.onupgradeneeded = function (event) {
			console.log('onupgradeneededイベント通過');
			//エラー時の連続発火防止
			if (nowInstance.getStatus() === 0) {
				obj.fdDB = event.target.result;
				//db.createObjectStore() が行えるのはこのイベントだけ
				try {
					var storeName = nowInstance.OSFD;
					var storeOption = {
						keyPath: nowInstance.KEYFD,
						autoIncrement: false
					};
					obj.objectStore = obj.fdDB.createObjectStore(storeName, storeOption);
				} catch (err) {
					console.error('openIndexedDB オブジェクトストア作成時にエラー発生: ' + err);
					nowInstance.setStatus(2);
				}
			}
		}
		//DBオープン成功時
		request.onsuccess = function (event) {
			console.log('onsuccessイベント通過');
			//データベースがオープンした場合
			//エラー時の連続発火防止
			if (nowInstance.getStatus() === 0) {
				obj.fdDB = event.target.result;
				//バージョンチェック
				if (obj.fdDB.version != nowInstance.DBVER) {
					//新たなバージョンを設定(Choromでしか動作しないモジュール,Firefoxの場合通過することの無い経路)
					var setVersion = obj.fdDB.setVersion(nowInstance.DBVER);
					console.log('IndexedDB setVersionメソッド処理通過');
					//バージョン設定に成功した場合
					setVersion.onsuccess = function (event) {
						//オブジェクトストアを作成
						try {
							var storeName = nowInstance.OSFD;
							var storeOption = {
								keyPath: nowInstance.KEYFD,
								autoIncrement: false
							};
							obj.objectStore = obj.fdDB.createObjectStore(storeName, storeOption);
							event.target.transaction.oncomplete = function () {
								nowInstance.setStatus(1);
								console.log('openIndexedDB End(1)');
							};
						} catch (err) {
							console.error('openIndexedDB オブジェクトストア作成時にエラー発生: ' + err);
							nowInstance.setStatus(2);
							console.log('openIndexedDB End(2)');
						}
					}
				} else {
					console.log('openIndexedDB オブジェクトストアはすでに作成済み。');
					nowInstance.setStatus(1);
					console.log('openIndexedDB End(3)');
				}
			}
		}
	},
	//------------------------------------------------------------
	//IndexedDB読み込み処理
	//------------------------------------------------------------
	readFoodData: function (obj) {
		console.log('readFoodData Start');
		var nowInstance = this;
		nowInstance.setStatus(0);
		//トランザクション発行(ブラウザ環境ごとに定数使用を切り替える)
		if (obj.acFlag == true) {
			//旧版
			var trans = obj.fdDB.transaction([nowInstance.OSFD], obj.IDBTRANSACTON.READ_ONLY);
		} else {
			//最新版
			var trans = obj.fdDB.transaction([nowInstance.OSFD], 'readonly');
		}
		obj.objectStore = trans.objectStore(nowInstance.OSFD);
		//データベースの読み込み処理
		var request = obj.objectStore.get(nowInstance.getKey());
		request.onerror = function (event) {
			//データの読み込み処理時にエラーが発生した場合
			console.error('readFoodData データの読み込みに失敗しました。: ' + event.target.errorCode);
			nowInstance.setStatus(2);
		};
		request.onsuccess = function (event) {
			if (typeof (event.target.result) !== 'undefined') {
				//写真
				if (!(event.target.result.photo == null || event.target.result.photo == '')) {
					nowInstance.setFile(event.target.result.photo);
				}
				//食事の種類
				nowInstance.setType(event.target.result.type);
				//料理名
				nowInstance.setName(unescape(event.target.result.name));
				//所要時間
				nowInstance.setTimeneeded(unescape(event.target.result.time));
				//１食あたりの予算
				nowInstance.setCost(unescape(event.target.result.cost));
				//レシピの情報
				nowInstance.setRecipe(unescape(event.target.result.recipe));
				//店名
				nowInstance.setShopName(unescape(event.target.result.shop));
				//緯度
				nowInstance.setLat(event.target.result.lat);
				//経度
				nowInstance.setLon(event.target.result.lon);
				nowInstance.setStatus(1);
			} else {
				//該当データがない場合
				nowInstance.setKey('');
				nowInstance.setStatus(1);
			}
		};
		console.log('readFoodData End');
	},
	//------------------------------------------------------------
	//IndexedDB削除処理
	//------------------------------------------------------------
	deleteFoodData : function (obj) {
		console.log('deleteFoodData Start');
		var nowInstance = this;
		nowInstance.setStatus(0);
		var request = null;
		//削除トランザクション発行(ブラウザ環境ごとに定数使用を切り替える)
		if (obj.acFlag == true) {
			//旧版
			var trans = obj.fdDB.transaction([nowInstance.OSFD], obj.IDBTRANSACTON.READ_WRITE);
		} else {
			//最新版
			var trans = obj.fdDB.transaction([nowInstance.OSFD], 'readwrite');
		}
		//オブジェクトストア発行
		obj.objectStore = trans.objectStore(nowInstance.OSFD);
		try {
			console.log('deleteFoodData データ削除対象 : ' + nowInstance.getKey());
			request = obj.objectStore.delete(nowInstance.getKey());
		} catch (err) {
			console.error('deleteFoodData データの削除構文エラー: ' + err);
			nowInstance.setStatus(2);
		}
		request.onerror = function (event) {
			console.error('deleteFoodData データの削除に失敗しました。: ' + event.target.errorCode);
			nowInstance.setStatus(2);
		};
		request.onsuccess = function (event) {
			event.target.transaction.oncomplete = function () {
				console.log('deleteFoodData データの削除完了');
				nowInstance.setStatus(1);
			};
		};
		console.log('deleteFoodData End');
	},
	//------------------------------------------------------------
	//IndexedDB更新処理
	//------------------------------------------------------------
	updateFoodData: function (obj) {
		console.log('updateFoodData Start');
		var nowInstance = this;
		nowInstance.setStatus(0);
		var request = null;
		//更新トランザクション発行(ブラウザ環境ごとに定数使用を切り替える)
		if (obj.acFlag == true) {
			//旧版
			var trans = obj.fdDB.transaction([nowInstance.OSFD], obj.IDBTRANSACTON.READ_WRITE);
		} else {
			//最新版
			var trans = obj.fdDB.transaction([nowInstance.OSFD], 'readwrite');
		}
		//オブジェクトストア発行
		obj.objectStore = trans.objectStore(nowInstance.OSFD);
		try {
			var idbData = { ymdskey: nowInstance.getKey(), type: nowInstance.getType(), name: escape(nowInstance.getName()), time: escape(nowInstance.getTimeneeded()), cost: escape(nowInstance.getCost()), recipe: escape(nowInstance.getRecipe()), shop: escape(nowInstance.getShopName()), lat: nowInstance.getLat(), lon: nowInstance.getLon(), photo: nowInstance.getFile() };
			request = obj.objectStore.put(idbData);
		} catch (err) {
			console.error('updateFoodData データの更新構文エラー: ' + err);
			nowInstance.setStatus(2);
		}
		request.onerror = function (event) {
			console.error('updateFoodData データの更新に失敗しました。: ' + event.target.errorCode);
			nowInstance.setStatus(2);
		};
		request.onsuccess = function (event) {
			event.target.transaction.oncomplete = function () {
				console.log('updateFoodData データの更新完了');
				nowInstance.setStatus(1);
			};
		};
		console.log('updateFoodData End');
	}
}
