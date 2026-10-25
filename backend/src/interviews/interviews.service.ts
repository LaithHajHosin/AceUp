import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { normalizeCategory } from '../questions/question-validation.js';

@Injectable()
export class InterviewsService implements OnModuleInit {
  private get interviews() { return this.connection.collection('interviews'); }
  constructor(@InjectConnection() private readonly connection: Connection) {}
  async onModuleInit() {
    await this.interviews.createIndex({ id: 1 }, { unique: true });
    await this.interviews.createIndex({ ownerId: 1 });
    await this.interviews.createIndex({ questionIds: 1 });
  }
  private async nextId() {
    const result = await this.connection.collection<any>('counters').findOneAndUpdate({ _id:'interviews' }, { $inc:{seq:1} }, {upsert:true,returnDocument:'after'});
    return result?.seq ?? 1;
  }
  private async names(ids:number[]) {
    const users = await this.connection.collection('users').find({id:{$in:[...new Set(ids)]}},{projection:{id:1,username:1}}).toArray();
    return new Map(users.map((u:any)=>[u.id,u.username]));
  }
  private async summary(row:any) {
    const names=await this.names([row.ownerId]);
    return {id:row.id,ownerId:row.ownerId,ownerUsername:names.get(row.ownerId)??null,title:row.title,description:row.description??'',category:row.category,difficulty:row.difficulty,questionCount:row.questionIds.length,timeLimitSeconds:row.timeLimitSeconds,createdAt:new Date(row.createdAt).toISOString(),updatedAt:new Date(row.updatedAt).toISOString()};
  }
  async list(query:any) {
    const filter:any={};
    if(query.category) filter.category=normalizeCategory(query.category);
    if(query.difficulty) filter.difficulty=query.difficulty;
    if(query.ownerId) filter.ownerId=Number(query.ownerId);
    if(query.search) filter.title={$regex:escapeRegex(query.search),$options:'i'};
    const rows=await this.interviews.find(filter).sort({createdAt:-1}).toArray();
    return Promise.all(rows.map((r:any)=>this.summary(r)));
  }
  async get(id:number) {
    const row=await this.interviews.findOne({id});
    if(!row) throw new NotFoundException({statusCode:404,error:'Not Found',code:'NOT_FOUND',message:'Interview not found'});
    const questions=await this.connection.collection('questions').find({id:{$in:row.questionIds}}).toArray();
    const byId=new Map(questions.map((q:any)=>[q.id,q]));
    const ordered=row.questionIds.map((qid:number)=>byId.get(qid)).filter(Boolean);
    const publicQuestions=await Promise.all(ordered.map((q:any)=>this.publicQuestion(q)));
    return {...await this.summary(row),questions:publicQuestions};
  }
  private async publicQuestion(q:any) {
    const user=await this.connection.collection('users').findOne({id:q.ownerId},{projection:{username:1}});
    return {id:q.id,ownerId:q.ownerId,ownerUsername:user?.username??null,prompt:q.prompt,category:q.category,difficulty:q.difficulty,type:q.type,
      choices:q.type==='multiple_choice'?(q.choices??[]).map(({id,text}:any)=>({id,text})):null,
      codeSnippet:q.type==='code_output'?(q.codeSnippet??null):null,
      createdAt:new Date(q.createdAt).toISOString(),updatedAt:new Date(q.updatedAt).toISOString()};
  }
  private async validate(body:any) {
    if(body.title!==undefined && (typeof body.title!=='string'||body.title.trim().length<3||body.title.trim().length>100)) this.bad('title must contain 3 to 100 characters');
    if(body.description!==undefined && (typeof body.description!=='string'||body.description.length>1000)) this.bad('description must be at most 1000 characters');
    if(body.category!==undefined && (typeof body.category!=='string'||normalizeCategory(body.category).length<2||normalizeCategory(body.category).length>40)) this.bad('category must contain 2 to 40 characters');
    if(body.difficulty!==undefined&&!['easy','medium','hard'].includes(body.difficulty)) this.bad('difficulty is invalid');
    if(body.timeLimitSeconds!==undefined&&(!Number.isInteger(body.timeLimitSeconds)||body.timeLimitSeconds<30||body.timeLimitSeconds>3600)) this.bad('timeLimitSeconds must be 30 to 3600');
    if(body.questionIds!==undefined) {
      if(!Array.isArray(body.questionIds)||body.questionIds.length<1||body.questionIds.length>20||body.questionIds.some((n:any)=>!Number.isInteger(n)||n<1)) this.bad('questionIds must contain 1 to 20 positive integer ids');
      if(new Set(body.questionIds).size!==body.questionIds.length) this.bad('questionIds must be distinct');
      const count=await this.connection.collection('questions').countDocuments({id:{$in:body.questionIds}});
      if(count!==body.questionIds.length) throw new BadRequestException({statusCode:400,error:'Bad Request',code:'QUESTION_NOT_FOUND_IN_LIST',message:'One or more question ids do not exist'});
    }
  }
  private bad(message:string):never { throw new BadRequestException({statusCode:400,error:'Bad Request',code:'VALIDATION_FAILED',message}); }
  async create(body:any,ownerId:number) {
    await this.validate(body);
    if(body.title===undefined||body.category===undefined||body.difficulty===undefined||body.questionIds===undefined||body.timeLimitSeconds===undefined) this.bad('title, category, difficulty, questionIds and timeLimitSeconds are required');
    const now=new Date(); const row={...body,id:await this.nextId(),ownerId,title:body.title.trim(),description:body.description??'',category:normalizeCategory(body.category),createdAt:now,updatedAt:now};
    await this.interviews.insertOne(row); return this.get(row.id);
  }
  async update(id:number,patch:any,ownerId:number) {
    const current=await this.interviews.findOne({id});
    if(!current) throw new NotFoundException({statusCode:404,error:'Not Found',code:'NOT_FOUND',message:'Interview not found'});
    if(current.ownerId!==ownerId) throw new ForbiddenException({statusCode:403,error:'Forbidden',code:'NOT_OWNER',message:'You do not own this interview'});
    const merged={...current,...patch}; await this.validate(merged);
    if(!merged.title||!merged.category||!merged.difficulty||!Array.isArray(merged.questionIds)||merged.timeLimitSeconds===undefined) this.bad('Updated interview must remain valid');
    merged.title=merged.title.trim(); merged.category=normalizeCategory(merged.category); merged.updatedAt=new Date(); delete merged._id;
    await this.interviews.updateOne({id},{$set:merged}); return this.get(id);
  }
  async remove(id:number,ownerId:number) {
    const row=await this.interviews.findOne({id});
    if(!row) throw new NotFoundException({statusCode:404,error:'Not Found',code:'NOT_FOUND',message:'Interview not found'});
    if(row.ownerId!==ownerId) throw new ForbiddenException({statusCode:403,error:'Forbidden',code:'NOT_OWNER',message:'You do not own this interview'});
    await this.interviews.deleteOne({id});
  }
}
function escapeRegex(value:string){return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
