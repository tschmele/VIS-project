import { Timeline } from "./timeline.js";
import { ChannelChart } from "./channel.js";
import { Streamgraph } from "./streamgraph.js";
// import { slider_snap } from "./slider.js";

const FOLDER = '../data/discord/prepared/'
const FILES = [
    'stacked daily activity.csv',
    'stacked weekly activity.csv'
]
const TL_FILE = 'combined activitiy.csv'

const SELECTOR_CHANNEL_ID = 'channel_select';
const CHANNEL_ID = '#channel';
const TIMELINE_ID = '#timeline';
const STREAMGRAPH_ID = '#streamgraph';

const START = new Date(2022, 0, 1);
const END = new Date(2024, 0, 1);
const DAYS = d3.utcDay.range(START, END);
const WEEKS = d3.utcWeek.range(START, END);
const MONTHS = d3.utcMonth.range(START, END);

function open_file(location) {
    return d3.csv(location);
}

/**
 * function to set up the selector for channel chart
 * @param {[]} keys
 * set of values to be sorted into selector
 * 
 * currently only works for keys formatted as 'optgroup/option'
 * @param {string} id  
 * id for selector element
 * 
 * @returns {object} 
 * label - contains a reference to the <label> element
 * 
 * selector - contains the actual selector
 */
function create_selector(keys, id) {
    const label = channel.append('label')
        .attr('for', id)
        .text('activity in channel: ');
    const selector = channel.append('select')
        .attr('name', 'channels')
        .attr('id', id);
    let categories = [];
    keys.forEach(key => {
        let file_name = key.split('/');
        let category = file_name[0];
        let channel_name = file_name[1];

        let optgroup = categories.find(c => c.attr('label') == category);
        if (optgroup == undefined) {
            categories.push(selector.append('optgroup')
                .attr('label', category));
            
            categories[categories.length-1].append('option')
                .attr('value', key)
                .text(channel_name);
        } else {
            optgroup.append('option')
                .attr('value', key)
                .text(channel_name);
        }
    });
    return {label: label, selector: selector};
}

/**
 * read in the pre-formatted daily activity file for timeline
 */
d3.csv(FOLDER+TL_FILE, d => {
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
     */
    let timeline_BBox = d3.select(TIMELINE_ID).node().getBoundingClientRect();
    const timeline = new Timeline({
        parentElement: TIMELINE_ID,
        containerWidth: timeline_BBox.width,
        timeframe: {start: START, end: END}
    });
    timeline.data = t_data;
    timeline.updateVis();

    /**
     * in theory: 
     * create "empty" graphs for ss and cc
     * load all other files 
     * add the data to those graphs
    */
    let channel = d3.select(CHANNEL_ID);
    let channel_BBox = channel.node().getBoundingClientRect();
    const channel_chart = new ChannelChart({
        parentElement: CHANNEL_ID,
        containerWidth: channel_BBox.width,
        containerHeight: 400,
        timeframe: {start: START, end: END}
    });
    const streamgraph = new Streamgraph({
        parentElement: STREAMGRAPH_ID,
        containerWidth: channel_BBox.width,
        containerHeight: channel_chart.config.containerHeight + d3.select(SELECTOR_CHANNEL_ID).node().getBoundingClientRect().height,
        timeframe: {start: START, end: END},
        highlight: d3.select(SELECTOR_CHANNEL_ID).node().value
    });

    Promise.all(Array.from(FILES, f => open_file(FOLDER+f)))
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
        const channel_selector = create_selector(keys, SELECTOR_CHANNEL_ID);

        /**
         * format the bins for channel chart
         * d_bins => daily bins
         * w_bins => weekly bins
         */
        let d_bins = d3.bin()
            .value(d => d.Date)
            .thresholds(DAYS)(data[0]);
        let w_bins = d3.bin()
            .value(d => d.Date)
            .thresholds(WEEKS)(data[1]);

        channel_chart.data = w_bins;

        /**
         * add event listener to update cc and ss on selector change
         */
        d3.select(SELECTOR_CHANNEL_ID).node().addEventListener('change', function() {
            channel_chart.config.col = this.value;
            streamgraph.config.highlight = this.value;
            channel_chart.updateVis();
            streamgraph.updateVis();
        });
        
        channel_chart.updateVis();

        // // alternative set of keys to exclude dragons-den from server streamgraph
        // let mod_keys = data[0].columns.slice(1);
        // mod_keys.splice(mod_keys.indexOf('MAIN/dragons-den'), 1);

        /**
         * format the stacks for server streamgraph
         * d_stacks => daily values
         * w_stacks => weekly values
         */
        let d_stacks = d3.stack()
            .order(d3.stackOrderInsideOut)
            .offset(d3.stackOffsetSilhouette)
            .keys(keys)
            (data[0])
        let w_stacks = d3.stack()
            .order(d3.stackOrderInsideOut)
            .offset(d3.stackOffsetSilhouette)
            .keys(keys)
            (data[1])
        
        streamgraph.data = w_stacks;
        streamgraph.config.interval = 'Weeks';
        streamgraph.updateVis();

        /**
         * add event listener for adjusting the range of the timeline
         * updates both other visualizations
         */
        timeline.svg.node().addEventListener('rendered', e => {
            let tframe = e.detail.tframe
            channel_chart.config.timeframe = tframe;
            streamgraph.config.timeframe = tframe;

            channel_chart.updateVis();
            streamgraph.updateVis();
        });

    }).catch((error) => {
        console.log(error);
    });
    
}).catch((error) => {
    console.log(error);
});