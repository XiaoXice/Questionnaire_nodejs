let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let user = new Schema({
    student_id: String,
    name: String,
    school: String,
    user_class: String,
    telephone: String,
    user_ip: String,
    test_list:[{type: mongoose.Schema.ObjectId, ref: "test_paper"}],
});
let activity = new Schema({
    name: String,
    strat_time: Date,
    end_time: Date,
    question_num: Number,
    question_list: [{type: mongoose.Schema.ObjectId, ref: "question"}],
    time_lim: Number,
    contestant_paper_list: [{type: mongoose.Schema.ObjectId, ref: "test_paper"}],
})
let question = new Schema({
    type: Number,
    problem: String,
    answer:[{
        content: String,
        price: Number,
        try_user_list:[{type: mongoose.Schema.ObjectId, ref: "user"}],
    }]
})
let test_paper = new Schema({
    user_id: {type: mongoose.Schema.ObjectId, ref: "user"},
    activity: {type: mongoose.Schema.ObjectId, ref: "activity"},
    question_list:[{type: mongoose.Schema.ObjectId, ref: "question"}],
    answer: [String],
    time_start: Date,
    time_end: Date,
    fraction: Number,
})
user.statics.init_user = function(user){
    return new Promise((rec,rej)=>{
        this.findOne({telephone:user.telephone},async (err,rew)=>{
            if(err) console.log(err);
            if(rew){
                rew.name = post.name;
                rew.student_id = post.student_id;
                rew.school = post.school;
                rew.user_class = post.user_class;
                await rew.save();
                rec(rew._id);
                return;
            }
            let a_user = new this(user);
            await a_user.save();
            rec(a_user._id);
        })
    })
}
user.static.add_test = function(user_id,test_id){
    this.findById(user_id).exec(async(err,rew)=>{
        if(err)console.log(err);
        rew.test_list.push(test_id);
        await rew.save();
        rec(rew);
    })
}
activity.static.add_test = function(activity_id,test_id){
    this.findById(activity_id).exec(async(err,rew)=>{
        if(err)console.log(err);
        rew.contestant_paper_list.push(test_id);
        await rew.save();
        rec(rew);
    })
}
activity.static.get_tital = function(activity_id){
    return new Promise((rec,rej)=>{
        this.findById(activity_id,(err,rew)=>{
            if(err)console.log(err);
            if(rew){
                rec(rew.name);
            }else{
                rec('NULL');
            }
        })
    })
}
activity.static.get_paper = function(activity_id,no_time_lim = false){
    return new Promise((rec,rej)=>{
        this.findById(activity_id).populate('question_list').exec((err,rew)=>{
            if(err) console.log(err);
            let now = new Date();
            if((now < rew.end_time && now > rew.strat_time)||no_time_lim){
                let question_list = rew.question_list;
                while (question_list.length > rew.question_num) {
                    question_list.splice(Math.floor(Math.random()*(question_list.length)),1);
                }
                for (it of question_list) {
                    for (at in it.answer) {
                        it.answer[a].num = at + it.answer.length * Math.floor(Math.random()*5000);
                        delete it.answer[a].price;
                        delete it.answer[a].try_user_list;
                    }
                    it.question_id = it._id;
                }
                rec({
                    time_lim: rew.time_lim,
                    paper_id: rew._id,
                    question_list: question_list
                });
            }else{
                rec('time_err');
            }
        })
    })
}
activity.static.is_time_out = function(activity_id,strat_time,end_time){
    return new Promise((rec,rej)=>{
        this.findById(activity_id).exec((err,rew)=>{
            if(err)console.log(err);
            let use_time = end_time - strat_time / 1000;
            if(rew.time_lim - use_time > -20){
                rec(false);
            }else{
                rec(true);
            }
        })
    })
}
test_paper.static.log_in = function(question_db,activity_id,user_id,strat_time,end_time,post){
    return new Promise((rec,rej)=>{
        this.findOne({user_id: user_id,activity:activity_id}).exec(async(err,rew)=>{
            if(err)console.log(err);
            if(rew){
                rec("had");
            }else{
                let a_test_paper = new this({
                    user_id: user_id,
                    activity:activity_id,
                    question_list:[],
                    answer:[],
                    time_start: strat_time,
                    time_end: end_time,
                    fraction: 0
                })
                let promise_list = [];
                for(a in post){
                    promise_list.push(question_db.get_in_it(a,post[a],user_id));
                    a_test_paper.answer.push(post[a]);
                    a_test_paper.problem.push(a);
                }
                let fraction_list = await Promise.all(promise_list);
                a_test_paper.fraction = eval(fraction_list.join("+"));
                await a_test_paper.save();
                rec(a_test_paper._id);
            }
        })
    })
}
question.static.get_in_it = function(question_id,answer_num,user_id){
    return new Promise((rec,rej)=>{
        this.findById(question_id).exec((err,rew)=>{
            if(err) console.log(err);
            if(rew.answer[answer_num%rew.answer.length].try_user_list.indexOf(user_id) == -1){
                rew.answer[answer_num%rew.answer.length].try_user_list.push(user_id);
            }
            rec(rew.answer[answer_num%rew.answer.length].price);
        })
    })
}
mongoose.connect("mongodb://127.0.0.1:27017/question", { config: { autoIndex: false } });
let user_db = mongoose.model('user', user);
let activity_db = mongoose.model('activity', activity);
let question_db = mongoose.model('question', question);
let test_paper_db = mongoose.model('test_paper', test_paper);
let cookie_db = mongoose.model('cookie',cookie);

module.exports={
    user: user_db,
    activity: activity_db,
    question: question_db,
    test_paper: test_paper_db,
    cookie: cookie_db,
}