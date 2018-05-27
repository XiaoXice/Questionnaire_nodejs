let mongoose = require('mongoose');
let csv = require('fast-csv');
let fs = require('fs');
let Schema = mongoose.Schema;
let admin = new Schema({
    user_name: String,
    password: String,
    activity_list: [{ type: mongoose.Schema.ObjectId, ref: "activity" }]
})
let user = new Schema({
    student_id: String,
    name: String,
    school: String,
    user_class: String,
    telephone: String,
    user_ip: String,
    test_list: [{ type: mongoose.Schema.ObjectId, ref: "test_paper" }],
});
let activity = new Schema({
    name: String,
    strat_time: Date,
    end_time: Date,
    question_num: Number,
    question_list: [{ type: mongoose.Schema.ObjectId, ref: "question" }],
    time_lim: Number,
    contestant_paper_list: [{ type: mongoose.Schema.ObjectId, ref: "test_paper" }],
})
let question = new Schema({
    type: Number,
    problem: String,
    answer: [{
        content: String,
        price: Number,
        try_user_list: [{ type: mongoose.Schema.ObjectId, ref: "user" }],
    }]
})
let test_paper = new Schema({
    user_id: { type: mongoose.Schema.ObjectId, ref: "user" },
    activity: { type: mongoose.Schema.ObjectId, ref: "activity" },
    question_list: [{ type: mongoose.Schema.ObjectId, ref: "question" }],
    answer: [String],
    time_start: Date,
    time_end: Date,
    fraction: Number,
})
admin.static.is_login_in = function (user_name, password) {
    return new Promise((rec, rej) => {
        this.findOne({ user_name: user_name }).populate('activity_list').exec((err, rew) => {
            if (err) console.log(err);
            if (rew && password == rew.password) {
                let out = [];
                for (it of rew.activity_list) {
                    out.push({
                        activity_id: it._id,
                        name: it.name,
                        num: it.contestant_paper_list.length
                    })
                }
                rec(out);
            } else {
                rec(false);
            }
        })
    })
}
admin.static.add_activity = function (user_id, activity_id) {
    return new Promise((rec, rej) => {
        this.findById(user_id).exec(async (err, rew) => {
            if (err) console.log(err);
            rew.activity_list.push(activity_id);
            await rew.save();
            let out = [];
            for (it of rew.activity_list) {
                out.push({
                    activity_id: it._id,
                    name: it.name,
                    num: it.contestant_paper_list.length
                })
            }
            rec(out);
        })
    })
}
user.statics.init_user = function (user) {
    return new Promise((rec, rej) => {
        this.findOne({ telephone: user.telephone }, async (err, rew) => {
            if (err) console.log(err);
            if (rew) {
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
user.static.add_test = function (user_id, test_id) {
    this.findById(user_id).exec(async (err, rew) => {
        if (err) console.log(err);
        rew.test_list.push(test_id);
        await rew.save();
        rec(rew);
    })
}
activity.static.add_test = function (activity_id, test_id) {
    this.findById(activity_id).exec(async (err, rew) => {
        if (err) console.log(err);
        rew.contestant_paper_list.push(test_id);
        await rew.save();
        rec(rew);
    })
}
activity.static.get_tital = function (activity_id) {
    return new Promise((rec, rej) => {
        this.findById(activity_id, (err, rew) => {
            if (err) console.log(err);
            if (rew) {
                rec(rew.name);
            } else {
                rec('NULL');
            }
        })
    })
}
activity.static.get_paper = function (activity_id, no_time_lim = false) {
    return new Promise((rec, rej) => {
        this.findById(activity_id).populate('question_list').exec((err, rew) => {
            if (err) console.log(err);
            let now = new Date();
            if ((now < rew.end_time && now > rew.strat_time) || no_time_lim) {
                let question_list = rew.question_list;
                while (question_list.length > rew.question_num) {
                    question_list.splice(Math.floor(Math.random() * (question_list.length)), 1);
                }
                for (it of question_list) {
                    for (at in it.answer) {
                        it.answer[a].num = at + it.answer.length * Math.floor(Math.random() * 5000);
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
            } else {
                rec('time_err');
            }
        })
    })
}
activity.static.is_time_out = function (activity_id, strat_time, end_time) {
    return new Promise((rec, rej) => {
        this.findById(activity_id).exec((err, rew) => {
            if (err) console.log(err);
            let use_time = end_time - strat_time / 1000;
            if (rew.time_lim - use_time > -20) {
                rec(false);
            } else {
                rec(true);
            }
        })
    })
}
activity.static.new_a_activity = function (question_db, post, file) {
    return new Promise((rec, rej) => {
        let a_activity = new this({
            name: post.name,
            strat_time: new Date(post.strat_time),
            end_time: new Date(post.end_time),
            question_num: post.question_num,
            question_list: [],
            time_lim: post.time_lim,
            contestant_paper_list: [],
        })
        let promise_list = [];
        fs.createReadStream(file.path)
            .pipe(csv())
            .on("data", (data) => {
                if (data[3] != "A选项的分值") {
                    let out = { answer: [] };
                    for (key in data) {
                        if (data[key] === '') {
                            if (key == 0) {
                                out.type = Number(data[key]);
                            } else if (key == 1) {
                                out.problem = data[key];
                            } else {
                                if (key % 2 == 0) {
                                    out.answer.push({ content: data[key], price: 0, try_user_list: [] });
                                } else {
                                    out.answer[parseInt(key / 2) - 1].price = Number(data[key]);
                                }
                            }
                        }
                    }
                    promise_list.push(question_db.add_question(out));
                }
            })
            .on("end", async () => {
                a_activity.question_list = await Promise.all(promise_list);
                await a_activity.save();
                rec(a_activity._id);
            });
    })
}
// name student_id school user_class telephone fraction
activity.static.get_fraction_out_put = function (test_db, activity_id) {
    return new Promise((rec, rej) => {
        this.findById(activity_id).exec(async (err, rew) => {
            if (err) console.log(err);
            let promise_list = [];
            for (i of rew.contestant_paper_list) {
                promise_list.push(test_db.get_list_adout_fraction_csv(i));
            }
            let out_put = await Promise.all(promise_list);
            out_put.unshift("name,student_id,school,user,class,telephone,fraction");
            let random = new Promise((rec, rej) => {
                require('crypto').randomBytes(32, function (ex, buf) {
                    var token = buf.toString('hex');
                    rec(token);
                });
            })
            let fileData = Buffer.from(out_put.join('\n'));
            let path = '/tmp/' + (await random()) + '.csv'
            let wstream = fs.createWriteStream(path);
            wstream.on('open', () => {
                const blockSize = 128;
                const nbBlocks = Math.ceil(fileData.length / (blockSize));
                for (let i = 0; i < nbBlocks; i += 1) {
                    const currentBlock = fileData.slice(
                        blockSize * i,
                        Math.min(blockSize * (i + 1), fileData.length),
                    );
                    wstream.write(currentBlock);
                }
                wstream.end();
            });
            wstream.on('finish', () => {rec(path);});
        })
    })
}
test_paper.static.get_list_adout_fraction_csv = function (test_id) {
    return new Promise((rec, rej) => {
        this.findById(test_id).populate("user_id").exec((err, rew) => {
            if (err) console.log(err);
            let out = [
                rew.user_id.name,
                rew.user_id.student_id,
                rew.user_id.school,
                rew.user_id.user_class,
                rew.user_id.telephone,
                rew.fraction
            ];
            rec(out.join(','));
        })
    })
}
test_paper.static.log_in = function (question_db, activity_id, user_id, strat_time, end_time, post) {
    return new Promise((rec, rej) => {
        this.findOne({ user_id: user_id, activity: activity_id }).exec(async (err, rew) => {
            if (err) console.log(err);
            if (rew) {
                rec("had");
            } else {
                let a_test_paper = new this({
                    user_id: user_id,
                    activity: activity_id,
                    question_list: [],
                    answer: [],
                    time_start: strat_time,
                    time_end: end_time,
                    fraction: 0
                })
                let promise_list = [];
                for (a in post) {
                    promise_list.push(question_db.get_in_it(a, post[a], user_id));
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
question.static.get_in_it = function (question_id, answer_num, user_id) {
    return new Promise((rec, rej) => {
        this.findById(question_id).exec((err, rew) => {
            if (err) console.log(err);
            if (rew.answer[answer_num % rew.answer.length].try_user_list.indexOf(user_id) == -1) {
                rew.answer[answer_num % rew.answer.length].try_user_list.push(user_id);
            }
            rec(rew.answer[answer_num % rew.answer.length].price);
        })
    })
}
question.static.add_question = function (in_question) {
    let a_new_question = new this(in_question);
    return new Promise(async (rec, rej) => {
        await a_new_question.save();
        rec(a_new_question._id);
    })
}
mongoose.connect("mongodb://127.0.0.1:27017/question", { config: { autoIndex: false } });
let admin_db = mongoose.model('admin', admin);
let user_db = mongoose.model('user', user);
let activity_db = mongoose.model('activity', activity);
let question_db = mongoose.model('question', question);
let test_paper_db = mongoose.model('test_paper', test_paper);
let cookie_db = mongoose.model('cookie', cookie);

module.exports = {
    admin: admin_db,
    user: user_db,
    activity: activity_db,
    question: question_db,
    test_paper: test_paper_db,
    cookie: cookie_db,
}