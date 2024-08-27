import {Timeline} from "./timeline.js";
import { ChannelChart } from "./channel.js";

// fix with node:fs later
const folder = '../data/discord/'
const files = [
    // 'MAIN - dragons-den [666328861985865749].csv',
    // 'MAIN - general [666328804372906040].csv',
    'MAIN - cringe-cafe [666328839114326026].csv',
    // 'MAIN - mental-health [666328887759994891].csv',
    // 'MAIN - share-stuff-you-made [666328917237563419].csv',
    // 'archived stream spoiler chats - 13-sentinels-spoiler-chat [1088233424092942406].csv',
    // 'archived stream spoiler chats - armored-core-spoiler-garage [1145038500534702120].csv',
    // 'archived stream spoiler chats - botwtotk-shrine-spoiler [1102673766837919844].csv',
    // 'archived stream spoiler chats - call-me-al-somnium-spoiler [1061323799619969134].csv',
    // 'archived stream spoiler chats - dp-spoiler-chat-on-jads [1082723283700551880].csv',
    // 'archived stream spoiler chats - ff16-spoilers [1121474497099337821].csv',
    // 'archived stream spoiler chats - ghost-trick-spoilers [1128723347300175953].csv',
    // 'archived stream spoiler chats - inscryption-spoiler-deck [1143546861387522048].csv',
    // 'archived stream spoiler chats - lis-true-colors-spoilers [1052997665610285137].csv',
    // 'archived stream spoiler chats - outer-wilds-spoiler-chat [746004186155450458].csv',
    // 'archived stream spoiler chats - rabiribi-spoiler-burrow-for-some-reason [1130898595512586261].csv',
    // 'archived stream spoiler chats - staaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaahfield-spoiler-den [1146903148972216332].csv',
    // 'archived stream spoiler chats - va11-hall-of-spoilers [1179100150191370371].csv',
    // 'archived stream spoiler chats - you-can-call-me-ai-2-spoiler-chat [1134163920769273906].csv',
    // 'archived stream spoiler chats - zero-escape-spoiler-chan [974341120198844467].csv',
    // 'dragons-den - 9 rows 9 columns 9 boxes [1055403674798653450].csv',
    // 'dragons-den - AI Somnium Files 2 spoiler den [989780272067264525].csv',
    // 'dragons-den - baldurs gate 3 goty den [1173841759890051093].csv',
    // 'dragons-den - Elden Ring Pen Shadow of the Nerd Tree (Spoilers Must be Marked) [945882707785826375].csv',
    // 'dragons-den - evolve idol [1116437039706026105].csv',
    // 'dragons-den - game jam dvd [1138496234982748251].csv',
    // 'dragons-den - GoW Raggyrock spoiler Den [1039499797729648680].csv',
    // 'dragons-den - Guilty Gear Den [874780655093944330].csv',
    // 'dragons-den - Jenshin Den [870694886746230804].csv',
    // 'dragons-den - roguelike den [1127095969348071545].csv',
    // 'Important - announcements [309158436392796161].csv',
    // 'Important - stream-announcements [392451461650448385].csv',
    // 'Stream Stuff - jadseya-awards-2023 [1178740821168766976].csv',
    // 'Stream Stuff - stream-art-museum [484604584174813184].csv'
]
const tl_activity = 'prepared/combined activitiy.csv'

// const margin = {top: 20, right: 30, bottom: 30, left: 40};
// const chart = d3.select('#chart');

const start = new Date(2022, 0, 1);
const end = new Date(2023, 11, 31);
const days = d3.utcDay.range(start, end);
const weeks = d3.utcWeek.range(start, end);
const months = d3.utcMonth.range(start, end);

/**
 * read in the pre-formatted daily activity file for timeline
 */
d3.csv(folder+tl_activity, d => {
    return {
        Date: d3.utcParse("%Y-%m-%d %H:%M:%S%Z")(d.Date),
        Activity: +d.Activity
    }
})
.then((data) => {
    /**
     * create timeline
     * data pre-formatted with activity per day
     * TODO : bi-slider for global date-range
     */
    let parent_BBox = d3.select('#timeline').node().getBoundingClientRect();
    const timeline = new Timeline({
        parentElement: '#timeline',
        containerWidth: parent_BBox.width,
        timeframe: {start: start, end: end}
    });
    timeline.data = data;
    timeline.updateVis();

    /**
     * in theory: 
     * create "empty" graphs for ss and cc
     * load all other files 
     * add the data to those graphs
     * 
     * current state:
     * loading one file for cc poc
     */
    function open_file(location) {
        return d3.csv(location, d => {
            return {
                Author: d.Author,
                Date: d3.utcParse("%Y-%m-%dT%H:%M:%S.%L0000%Z")(d.Date),
                Reactions: +d.Reactions
            }
        });
    }
    parent_BBox = d3.select('#channel').node().getBoundingClientRect();
    const channel_chart = new ChannelChart({
        parentElement: '#channel',
        containerWidth: parent_BBox.width,
        timeframe: {start: start, end: end}
    });
    Promise.all(Array.from(files, f => open_file(folder+f)))
    .then((data) => {
        // console.log(data);

        let c_bins = d3.bin()
            .value(d => d.Date)
            .thresholds(weeks)(data[0]);

        c_bins.forEach(bin => {
            bin.Activity = bin.length;
            bin.forEach(msg => {
                bin.Activity = bin.Activity + msg.Reactions;
            });
        });

        console.log(c_bins);
        
    
        channel_chart.data = c_bins;
        channel_chart.updateVis();
        
    }).catch((error) => {
        console.log(error);
    })
    
    // console.log('all files loaded')
    
    // let s_bins = [];

    // data.forEach(file => {
    //     s_bins.push(d3.bin()
    //         .value(d => d.Date)
    //         .thresholds(days)(file));
    // });

    // console.log(bins);

    // currently only works if s_bins[0] contains a matching s_bin for all other S_bins
    // let c_bins = s_bins[0];

    // c_bins.forEach(c_bin => {
    //     c_bin.activity = 0;
    // });

    // s_bins.forEach((i_bins, i) => {
    //     i_bins.forEach(s_bin => {
    //         c_bins.forEach(c_bin => {
    //             if (c_bin.x0 == s_bin.x0 || (c_bin.x0 < s_bin.x0 && s_bin.x0 < c_bin.x1)) {
    //                 s_bin.forEach(s_msg => {
    //                     if (i == 0) {
    //                         c_bin.activity = c_bin.activity + s_msg.Reactions + 1;
    //                     } else {
    //                         c_bin.push(s_msg);
    //                         c_bin.activity = c_bin.activity + s_msg.Reactions + 1;
    //                     }
    //                 });
    //             }
    //         });
    //     });
    // });
    
    // console.log('all files binned and combined');
    // console.log(c_bins);
    
}).catch((error) => {
    console.log(error);
});