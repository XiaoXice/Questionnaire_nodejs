let Koa = require("koa");
let bodyParser = require('koa-body');
let route = require('koa-route');
const logger = require('koa-logger')
const compose = require('koa-compose');
let send = require('koa-send');
let db = require('./sql');
const app = new Koa();
app.use(bodyParser({ multipart: true }));
// app.use(async(ctx, next) => {
//     console.log(`Process ${ctx.request.method} ${ctx.request.url}...`);
//     await next();
// })
app.use(logger());
app.use(async (ctx, next) => {
    if (ctx.request.method == "POST") {
        // for(ctx.request.body in ctx.request.body);
        console.log(ctx.request.body);
    }
    await next();
})
let getTitale = async (ctx, next) => {
    ctx.response.body = JOSN.stringify({ name: (await db.activity.get_tital(ctx.query['paper_id'])) });
}
// start 返回问卷信息 开始计时
/**
 * name student_id school user_class telephone paper_id
 * 
 * setcookie
{
    time_lim: 600,
    paper_id: "sadsada",
    question_list:[
        {
            type: 0
            question_id : "sdadsadsad"
            question: "asdasd",
            answer:[
                {
                    num: number,
                    content: "sdafsdsa"
                },
            ]
        },
    ]
}
 */
let start = async (ctx, next) => {
    let post = ctx.request.body;
    let paper_id = post.paper_id;
    delete post.paper_id;
    post.user_ip = ctx.request.headers["x-real-ip"];
    ctx.session.user_id = await db.user.init_user(post);
    ctx.session.activity_id = paper_id;
    ctx.session.start_time = new Date();
    let rec = await db.activity.get_paper(paper_id);
    if (rec == "time_err") {
        ctx.response.body = JSON.stringify({ success: false, msg: "不在答题时间,不能答题" });
    } else {
        ctx.response.body = JSON.stringify(rec);
    }
}
//记录返回信息
/*
    [question_id = num]

    {
        success: true,
        msg: "您已经参加过","提交成功"
    }
*/
let end = async (ctx, next) => {
    let post = ctx.request.body;
    let end_time = new Date();
    if (await db.activity.is_time_out(
        ctx.session.activity_id,
        ctx.session.start_time,
        end_time
    )) {
        ctx.response.body = JSON.stringify({ success: false, msg: "用时过分长" });
    } else {
        let test_id = await db.test_paper.log_in(db.question,
            ctx.session.activity_id,
            ctx.session.user_id,
            ctx.session.start_time,
            end_time,
            post
        );
        if (test_id == 'had') {
            ctx.response.body = JSON.stringify({ success: false, msg: "已参加哦" });
        } else {
            await Promise.all([db.user.add_test(ctx.session.user_id, test_id),
            db.activity.add_test(ctx.session.activity_idtest_id, test_id)
            ])
            ctx.response.body = JSON.stringify({ success: true, msg: "已成功提交" });
        }
    }
}
let admin_login = async (ctx, next) => {
    let post = ctx.request.body;
    let admin = await db.admin.is_login_in(post.user_name, post.password)
    if (!admin === false) {
        ctx.session.admin = true;
        ctx.session.user_id = admin._id;
        ctx.response.body = JSON.stringify({ success: true, activity_list: admin });
    } else {
        ctx.session.admin = false;
        ctx.response.body = JSON.stringify({ success: false });
    }
}
/*
name
start_time
end_time
time_lim
question_num

file
type question A A.price B B.price
*/
let admin_upload = async (ctx, next) => {
    if (ctx.session.admin) {
        let post = ctx.request.body.fields;
        let file = ctx.request.body.files.file;
        let admin = await db.admin.add_activity(
            ctx.session.user_id,
            await db.activity.new_a_activity(db.question, post, file)
        )
        ctx.response.body = JSON.stringify({ success: true, activity_list: admin });
    } else {
        ctx.response.body = "请勿越级";
    }


}
// activity_id
let admin_download = async (ctx,next)=>{
    if (ctx.session.admin) {
        let path = await db.activity.get_fraction_out_put(db.test_paper,ctx.query["activity_id"]);
        await send(ctx, path,{ root: '/' });
    } else {
        ctx.response.body = "请勿越级";
    }
}
app.use(compose([
    route.get('/api/getTital', getTitale),
    route.post('/api/start', start),
    route.post('/api/end', end),
    route.post('/api/adminLogin', admin_login),
    route.post('/api/adminUpload', admin_upload)
]));
app.listen(8083);
console.log('app started at port 8083...');