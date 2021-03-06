import fetch from 'node-fetch';
import Ids from '../models/ids'
import UserInfoModel from '../models/v2/userInfo'
import StatusModel from "../models/v2/status";
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
/*qiniu.conf.ACCESS_KEY = 'Ep714TDrVhrhZzV2VJJxDYgGHBAX-KmU1xV1SQdS';
qiniu.conf.SECRET_KEY = 'XNIW2dNffPBdaAhvm9dadBlJ-H6yyCTIJLxNM_N6';*/


export default class BaseComponent {
	constructor(){
		this.idList = ['user_id', 'file_id', 'status_id', 'friendships_id', 'comment_id'];
	}
	async fetch(url = '', data = {}, type = 'GET', resType = 'JSON'){
		type = type.toUpperCase();
		resType = resType.toUpperCase();
		if (type == 'GET') {
			let dataStr = ''; //数据拼接字符串
			Object.keys(data).forEach(key => {
				dataStr += key + '=' + data[key] + '&';
			})

			if (dataStr !== '') {
				dataStr = dataStr.substr(0, dataStr.lastIndexOf('&'));
				url = url + '?' + dataStr;
			}
		}

		let requestConfig = {
			method: type,
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
		}

		if (type == 'POST') {
			Object.defineProperty(requestConfig, 'body', {
				value: JSON.stringify(data)
			})
		}
		let responseJson;
		try {
			const response = await fetch(url, requestConfig);
			if (resType === 'TEXT') {
				responseJson = await response.text();
			}else{
				responseJson = await response.json();
			}
		} catch (err) {
			console.log('获取http数据失败', err);
			throw new Error(err)
		}
		return responseJson
	}
	//获取id列表
	async getId(type){
		if (!this.idList.includes(type)) {
			console.log('id类型错误');
			throw new Error('id类型错误');
			return
		}
		try{
		  const idData = await Ids.findOne();
			idData[type] ++ ;
			await idData.save();
			return idData[type];
		}catch(err){
			console.log('获取ID数据失败');
			throw new Error(err)
		}
	}
	loadStatus(id){
		return new Promise(async (resolve, reject) => {
							var user = await UserInfoModel.findOne({id});
							if(user){
								var status_latest = await StatusModel.findOne({user_id: id}).sort({created_at:-1});
								user.status = status_latest;
								if(id){
									resolve(user)
								}else{
									reject(error)
								}
							}else{
								reject(error)
							}
						});
	}
}