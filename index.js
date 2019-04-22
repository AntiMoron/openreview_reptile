const chalk = require('chalk');
const curl = require('curl');
const queryString = require('query-string');
const fs = require('fs');
const path = require('path');

const dataUrl = 'https://openreview.net/notes';
const params = {
    // invitation: "ICLR.cc/2019/Conference/-/Blind_Submission",
    invitation: "ICLR.cc/2019/Conference/-/Paper.*/Meta_Review",
    // invitation: "ICLR.cc/2019/Conference/-/Withdrawn_Submission",
    // 只有blind_submission才开replyCount其他nodetails为true
    // details: "replyCount",
    nodetails: true,
    // 加载多少个
    limit: 1000,
    // 从第多少个加载
    offset: 0,
};
const metaReviewParams = {
    invitation: "ICLR.cc/2019/Conference/-/Paper.*/Meta_Review",
    // 只有blind_submission才开replyCount其他nodetails为true
    // details: "replyCount",
    nodetails: true,
    // 加载多少个
    limit: 1000,
    // 从第多少个加载
    offset: 0,
};

const withDrawParams = {
    invitation: "ICLR.cc/2019/Conference/-/Withdrawn_Submission",
    // 只有blind_submission才开replyCount其他nodetails为true
    // details: "replyCount",
    nodetails: true,
    // 加载多少个
    limit: 1000,
    // 从第多少个加载
    offset: 0,
};

const metaReviews = [];
// 拉去meta数据
const getMetas = (page, callback) => {
    curl.get(`${dataUrl}?${queryString.stringify({ ...metaReviewParams, offset: page * 1000 })}`, {}, (e, _, body) => {
        if (e) {
            console.log('metareview error: \n', chalk.red(JSON.stringify(e)));
            return;
        }
        console.log(chalk.green(`Page ${page} Meta Review Loaded Successfully`))
        const { notes = [] } = JSON.parse(body);
        for (let i = 0; i < notes.length; i++) {
            metaReviews.push(notes[i]);
        }
        callback && callback();
    });
};
// 这块儿可以优化下写法
getMetas(0, () => {
    getMetas(1, () => {
        const paramString = queryString.stringify(params)
        const url = `${dataUrl}?${paramString}`;

        console.log(chalk.yellow(`Loading:\n${url}\n\n`));

        curl.get(dataUrl, params, function (e, _, body) {
            if (e) {
                console.log('error: \n', chalk.red(JSON.stringify(e)));
                return;
            }
            const { notes } = JSON.parse(body);
            // console.log(JSON.stringify(notes, null, 2))
            let articles = notes.map(({ content = {} }) => {
                const {
                    id,
                    title,
                    forum,
                    pdf: pdfUrl
                } = content;
                return {
                    id,
                    title,
                    forum,
                    pdfUrl
                };
            });

            articles.forEach(article => {
                const {
                    id,
                } = article;
                const metaReview = metaReviews.find(({ forum }) => {
                    return forum === id;
                });
                if (!metaReview) {
                    article.deleted = true;
                    return;
                }
                const { content: {
                    recommendation
                } = {} } = metaReview;
                if (recommendation === 'Accept (Poster)') {
                    article.type = 'poster';
                } else if (recommendation === 'Accept (Oral)') {
                    article.type = 'oral';
                }
            });
            const scripts = articles.reduce((pre, cur) => {
                const {
                    title,
                    pdfUrl,
                    deleted,
                    type
                } = cur;
                if (deleted) {
                    return pre;
                }
                const sh = `curl ${`https://openreview.net${pdfUrl}`} -o "${type}/${title}.pdf"\n`;
                return pre + sh;
            }, 'cd pdf\n');
            fs.writeFileSync(path.resolve(__dirname, "./temp.sh"), scripts);
        });
    });
});
