'use strict';

import formidable from 'formidable'
import dtime from 'time-formater'
// import images from 'node-images'
import FileModel from "../../models/status/file";
import StatusModel from "../../models/v2/status";
import UserInfoModel from '../../models/v2/userInfo'
import AddressComponent from '../../prototype/addressComponent'
import config from "../../config/default";
const fs = require('fs');
const path = require('path');


class Status extends AddressComponent{
	constructor(){
		super();
		this.uploadImage = this.uploadImage.bind(this);
		this.create = this.create.bind(this);
	}
	async uploadImage(req, res, next) {
		if(!req.session.user_id) {
			res.send({
				code: 0,
				type: 'error',
				message: '请先登录'
			})
			return
		}
		try{
			const form = new formidable.IncomingForm();
			form.uploadDir = config.uploadDir;
			form.keepExtensions = true;
			form.maxFieldsSize = 20 * 1024 * 1024;
			form.parse(req, async (err, fields, files) => {
				if (err) {
					res.send({
						code: 0,
						type: 'error',
						message: '信息错误'
					})
					return
				}
				const oldTarget = path.basename(files.file.path);
				const newTarget = path.basename(files.file.path).split('upload_')[1];
				fs.rename(form.uploadDir+'/'+oldTarget,form.uploadDir+'/'+newTarget, function(err){
					 if(err){
					  throw err;
					 }
				});
				const id = await this.getId('file_id');
				const image = { id, idstr: id.toString(), filetype: 'image', path: form.uploadDir+'/', 
								basename: newTarget, filename: files.file.name, user_id: req.session.user_id, type: fields.type}

				const imageEntity = new FileModel(image);
				const imageInfo = await imageEntity.save();
				res.send({
					code: 1,
					data: {
						fileId: imageInfo.idstr
					},
					message: '上传成功'
				})
			})
		}catch(err){console.log(err)
			res.send({
				code: 0,
				type: 'error',
				message: '服务器异常'
			})
		}
	}
	async create(req, res, next){
		if(!req.session.user_id) {
			res.send({
				code: 0,
				type: 'error',
				message: '请先登录'
			})
			return
		}
		try{
			const form = new formidable.IncomingForm();
			form.parse(req, async (err, fields, files) => {
				const positionInfo = await this.guessPosition(req), id = await this.getId('status_id');
				const status = {
					id: id,
					idstr: id.toString(),
					created_at: dtime().format('YYYY-MM-DD HH:mm:ss'),
					mid: id,
					text: fields.text,
					source: '',
					favorited: false,
					truncated: false,
					geo:[positionInfo],
					user_id: req.session.user_id,
					visible: {
						type: fields.type
					},
					pic_ids: fields.pic_ids
				}
				const statusEntity = new StatusModel(status), statusInfo = await statusEntity.save();
				if(statusInfo) {
					const statuses_count = await StatusModel.find({user_id: statusInfo.user_id});
					if(statuses_count){
						const user = await UserInfoModel.update({id: statusInfo.user_id},{$set:{'statuses_count':statuses_count.length}});
					};
					res.send({
						code: 1,
						data: {
							statusInfo: statusInfo
						},
						message: '微博发布成功'
					})
				}
				
			})
		}catch(err){
			res.send({
				code: 0,
				type: 'error',
				message: '服务器异常'
			})
		}
	}
	async user_timeline(req, res, next){
		if(!req.session.user_id) {
			res.send({
				code: 0,
				type: 'error',
				message: '请先登录'
			})
			return
		}
		try{
			const {count = 20, page=1} = req.query
			let user_id = req.session.user_id,
					statusesList = await StatusModel.find({user_id})
													.skip((page-1)*parseInt(count))
													.limit(parseInt(count))
													.sort({created_at: 1}),
					total_number = (await StatusModel.find()).length,
					userInfo = await UserInfoModel.findOne({id: user_id});
			let  status={}, statuses=[];
			if(!userInfo || statusesList.length == 0){
				res.send({
					request: '/statuses/user_timeline',
					error_code: '20003',
					error: 'User does not exists',
					message: '用户不存在'
				});
				return
			}
			statusesList.forEach(item=>{
				status = {...item._doc, user: {...userInfo}._doc};
				delete status.user_id;
				statuses.push(status);
				status = {};
			}); 
			res.send({
				code: 0,
				data: {
					statuses,
					total_number
				},
				message: '查询成功'
			})
		}catch(err){
			console.log(err)
			res.send({
				code: 0,
				type: 'error',
				message: '服务器异常'
			})
		}
	}
	async show(req, res, next){
		if(!req.session.user_id) {
			res.send({
				code: 0,
				type: 'error',
				message: '请先登录'
			})
			return
		}
		try{
			if(!req.query.id) {
				res.send({
					code: 0,
					type: 'error',
					message: '缺失微博信息'
				})
				return
			}
			const dataList = await StatusModel.findOne({idstr: req.query.id});
			res.send({
				code: 0,
				data: dataList,
				message: '查询成功'
			})
		}catch(err){
			console.log(err)
			res.send({
				code: 0,
				type: 'error',
				message: '服务器异常'
			})
		}
	}
	async delete(req, res, next){
		if(!req.session.user_id) {
			res.send({
				code: 0,
				type: 'error',
				message: '请先登录'
			})
			return
		}
		try{
			const {status_id} = req.params;
			if(!status_id){
				res.send({
					code: 0,
					type: 'error',
					message: '缺失微博信息'
				})
				return
			}
			const statusInfo = await StatusModel.findOne({user_id: req.session.user_id,id: status_id});
			if(!statusInfo){
				res.send({
					code: 0,
					type: 'error',
					message: '该微博不存在'
				})
				return
			};
			await StatusModel.remove({id: statusInfo.id});
			res.send({
				code: 1,
				type: 'success',
				message: '删除微博成功'
			})
		}catch(err){
			console.log(err)
			res.send({
				code: 0,
				type: 'error',
				message: '服务器异常'
			})
		}
	}
}

export default new Status()