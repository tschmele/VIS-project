import {Timeline} from "./timeline.js";
import { ChannelChart } from "./channel.js";
import { Streamgraph } from "./streamgraph.js";

// fix with node:fs later
const folder = '../data/discord/'
const individual_files = [
    'MAIN - general [666328804372906040].csv',
    'MAIN - dragons-den [666328861985865749].csv',
    'MAIN - cringe-cafe [666328839114326026].csv',
    'MAIN - mental-health [666328887759994891].csv',
    'MAIN - share-stuff-you-made [666328917237563419].csv',
    'archived stream spoiler chats - 13-sentinels-spoiler-chat [1088233424092942406].csv',
    'archived stream spoiler chats - armored-core-spoiler-garage [1145038500534702120].csv',
    'archived stream spoiler chats - botwtotk-shrine-spoiler [1102673766837919844].csv',
    'archived stream spoiler chats - call-me-al-somnium-spoiler [1061323799619969134].csv',
    'archived stream spoiler chats - dp-spoiler-chat-on-jads [1082723283700551880].csv',
    'archived stream spoiler chats - ff16-spoilers [1121474497099337821].csv',
    'archived stream spoiler chats - ghost-trick-spoilers [1128723347300175953].csv',
    'archived stream spoiler chats - inscryption-spoiler-deck [1143546861387522048].csv',
    'archived stream spoiler chats - lis-true-colors-spoilers [1052997665610285137].csv',
    'archived stream spoiler chats - outer-wilds-spoiler-chat [746004186155450458].csv',
    'archived stream spoiler chats - rabiribi-spoiler-burrow-for-some-reason [1130898595512586261].csv',
    'archived stream spoiler chats - staaaaaaaaaaaaaaaaaaahfield-spoiler-den [1146903148972216332].csv',
    'archived stream spoiler chats - va11-hall-of-spoilers [1179100150191370371].csv',
    'archived stream spoiler chats - you-can-call-me-ai-2-spoiler-chat [1134163920769273906].csv',
    'archived stream spoiler chats - zero-escape-spoiler-chan [974341120198844467].csv',
    'dragons-den - 9 rows 9 columns 9 boxes [1055403674798653450].csv',
    'dragons-den - AI Somnium Files 2 spoiler den [989780272067264525].csv',
    'dragons-den - baldurs gate 3 goty den [1173841759890051093].csv',
    'dragons-den - Elden Ring Pen Shadow of the Nerd Tree [945882707785826375].csv',
    'dragons-den - evolve idol [1116437039706026105].csv',
    'dragons-den - game jam dvd [1138496234982748251].csv',
    'dragons-den - GoW Raggyrock spoiler Den [1039499797729648680].csv',
    'dragons-den - Guilty Gear Den [874780655093944330].csv',
    'dragons-den - Jenshin Den [870694886746230804].csv',
    'dragons-den - roguelike den [1127095969348071545].csv',
    'Important - announcements [309158436392796161].csv',
    'Important - stream-announcements [392451461650448385].csv',
    'Stream Stuff - jadseya-awards-2023 [1178740821168766976].csv',
    'Stream Stuff - stream-art-museum [484604584174813184].csv'
]
const bundled_files = [
    'prepared/stacked daily activity.csv',
    'prepared/stacked weekly activity.csv'
]

const tl_activity = 'prepared/combined activitiy.csv'

function open_individual_file(location) {
    return d3.csv(location, d => {
        return {
            Author: d.Author,
            Date: d3.utcParse("%Y-%m-%dT%H:%M:%S.%L0000%Z")(d.Date),
            Reactions: +d.Reactions
        }
    });
}
function open_bundled_file(location) {
    return d3.csv(location);
}

const start = new Date(2022, 0, 1);
const end = new Date(2024, 0, 1);
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
    let t_data = data;
    /**
     * create timeline
     * data pre-formatted with activity per day
     * TODO : bi-slider for global date-range
     */
    let timeline_BBox = d3.select('#timeline').node().getBoundingClientRect();
    const timeline = new Timeline({
        parentElement: '#timeline',
        containerWidth: timeline_BBox.width,
        timeframe: {start: start, end: end}
    });
    timeline.data = t_data;
    timeline.updateVis();

    /**
     * set up the selector for channel chart
     */
    let channel = d3.select('#channel');
    let channel_BBox = channel.node().getBoundingClientRect();

    const selector_label = channel.append('label')
        .attr('for', 'channel_select')
        .text('activity in channel: ');
    const channel_selector = channel.append('select')
        .attr('name', 'channels')
        .attr('id', 'channel_select');
    let categories = [];
    individual_files.forEach(file => {
        let file_name = file.split(' - ');
        let channel_name = file_name[1].split(' ');
        channel_name.pop();
        channel_name = channel_name.join('-');

        let optgroup = categories.find(c => c.attr('label') == file_name[0]);
        if (optgroup == undefined) {
            categories.push(channel_selector.append('optgroup')
                .attr('label', file_name[0]));
            
            categories[categories.length-1].append('option')
                .attr('value', file_name[0] + '/' + channel_name)
                .text(channel_name);
        } else {
            optgroup.append('option')
                .attr('value', file_name[0] + '/' + channel_name)
                .text(channel_name);
        }
    });

    /**
     * in theory: 
     * create "empty" graphs for ss and cc
     * load all other files 
     * add the data to those graphs
     */
    const channel_chart = new ChannelChart({
        parentElement: '#channel',
        containerWidth: channel_BBox.width,
        containerHeight: 400,
        timeframe: {start: start, end: end}
    });
    const streamgraph = new Streamgraph({
        parentElement: '#streamgraph',
        containerWidth: channel_BBox.width,
        containerHeight: channel_chart.config.containerHeight + d3.select('#channel_select').node().getBoundingClientRect().height,
        timeframe: {start: start, end: end},
        highlight: document.getElementById('channel_select').value
    });

    Promise.all(Array.from(bundled_files, f => open_bundled_file(folder+f)))
    .then((data) => {
        data.forEach(file => {
            file.forEach(element => {
                element.Date = d3.utcParse("%Y-%m-%d %H:%M:%S%Z")(element.Date)
                for (const col in element) {
                    if (col != 'Date')
                        element[col] =  +element[col];
                }
            });
        });
        let keys = data[0].columns.slice(1);

        let d_bins = d3.bin()
            .value(d => d.Date)
            .thresholds(days)(data[0]);

        let w_bins = d3.bin()
            .value(d => d.Date)
            .thresholds(weeks)(data[1]);

        channel_chart.data = w_bins;

        document.getElementById('channel_select').addEventListener('change', function() {
            channel_chart.config.col = this.value;
            streamgraph.config.highlight = this.value;
            channel_chart.updateVis();
            streamgraph.updateVis();
        });
        
        channel_chart.updateVis();

        let mod_keys = data[0].columns.slice(1);
        mod_keys.splice(mod_keys.indexOf('MAIN/dragons-den'), 1);

        let stackedData = d3.stack()
            .order(d3.stackOrderInsideOut)
            .offset(d3.stackOffsetSilhouette)
            .keys(keys)
            (data[1])
        
        streamgraph.data = stackedData;
        streamgraph.updateVis();

    }).catch((error) => {
        console.log(error);
    });
    
}).catch((error) => {
    console.log(error);
});