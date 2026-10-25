import 'reflect-metadata';
import { MongoClient } from 'mongodb';
import { SEED_QUESTIONS, SEED_USERNAME } from './seed-questions.js';

const uri=process.env.MONGODB_URI;
if(!uri) throw new Error('MONGODB_URI is required to seed questions');
const client=new MongoClient(uri);
await client.connect();
try {
  const db=client.db(process.env.MONGODB_DB);
  const users=db.collection<any>('users'); const questions=db.collection<any>('questions'); const counters=db.collection<any>('counters');
  let user=await users.findOne({username:SEED_USERNAME});
  if(!user){
    const next=await counters.findOneAndUpdate({_id:'users'},{$inc:{seq:1}},{upsert:true,returnDocument:'after'});
    user={id:next.seq,username:SEED_USERNAME,displayName:'Prep Bot'};
    await users.insertOne(user);
  }
  await questions.createIndex({id:1},{unique:true});
  await questions.createIndex({category:1,difficulty:1,type:1});
  await questions.createIndex({ownerId:1});
  for(const source of SEED_QUESTIONS){
    const exists=await questions.findOne({ownerId:user.id,prompt:source.prompt});
    if(exists) continue;
    const next=await counters.findOneAndUpdate({_id:'questions'},{$inc:{seq:1}},{upsert:true,returnDocument:'after'});
    const now=new Date();
    await questions.insertOne({...source,id:next.seq,ownerId:user.id,category:source.category.toLowerCase(),createdAt:now,updatedAt:now});
  }
  console.log(`Seed complete. Questions owned by ${SEED_USERNAME}: ${await questions.countDocuments({ownerId:user.id})}`);
} finally { await client.close(); }
