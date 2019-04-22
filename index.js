const chalk = require('chalk');
const curl = require('curl');
const queryString = require('query-string');
const fs = require('fs');
const path = require('path');

const dataUrl = 'https://openreview.net/notes';
const params = {
    invitation: "ICLR.cc/2019/Conference/-/Blind_Submission",
    // invitation: "ICLR.cc/2019/Conference/-/Paper.*/Meta_Review",
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

// P.S. withdraw什么垃圾...
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

const metaReviews = {};
const blinds = {};

// 拉去meta数据
const getMetas = (page) => {
    return new Promise((resolve) => {
        console.log(chalk.yellow(`${dataUrl}?${queryString.stringify({ ...metaReviewParams, offset: page * 1000 })}`));
        curl.get(`${dataUrl}?${queryString.stringify({ ...metaReviewParams, offset: page * 1000 })}`, {}, (e, _, body) => {
            if (e) {
                console.log('metareview error: \n', chalk.red(JSON.stringify(e)));
                return;
            }
            console.log(chalk.green(`Page ${page} Meta Review Loaded Successfully`))
            const { notes = [] } = JSON.parse(body);
            for (let i = 0; i < notes.length; i++) {
                const { forum } = notes[i];
                metaReviews[forum] = notes[i];
            }
            resolve && resolve();
        });
    });
};

const getBlindSubs = (page) => {
    return new Promise((resolve) => {
        const paramString = queryString.stringify({ ...params, offset: page * 1000 });
        const url = `${dataUrl}?${paramString}`;
        console.log(chalk.yellow(`Loading:\n${url}\n\n`));
        curl.get(url, {}, function (e, _, body) {
            if (e) {
                console.log('error: \n', chalk.red(JSON.stringify(e)));
                return;
            }
            console.log(chalk.green(`Page ${page} Blind Submissions Loaded Successfully`))
            const { notes } = JSON.parse(body);
            // console.log(JSON.stringify(notes, null, 2))
            const articles = notes.map((note) => {
                const {
                    id,
                    forum,
                    content: {
                        title,
                        pdf: pdfUrl
                    } = {}
                } = note;
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
                    forum
                } = article;
                const metaReview = metaReviews[id];
                console.log('blind', id, metaReview)
                if (!metaReview) {
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
                blinds[id] = article;
            });
            resolve && resolve();
        });
    });
}

// 这块儿可以优化下写法
getMetas(0)
    .then(() => {
        return getMetas(1);
    })
    .then(() => {
        return getMetas(2);
    })
    .then(() => {
        return getBlindSubs(0);
    })
    .then(() => {
        // console.log(blinds, metaReviews)
        const scripts = Object.keys(blinds).reduce((pre, cur) => {
            const {
                title,
                pdfUrl,
                type
            } = blinds[cur] || {};
            if (!type || !pdfUrl) {
                return pre;
            }
            const sh = `curl ${`https://openreview.net${pdfUrl}`} -o "${type}_${title}.pdf"\n`;
            return pre + sh;
        }, 'cd pdf\n');
        fs.writeFileSync(path.resolve(__dirname, "./temp.sh"), scripts);
    });