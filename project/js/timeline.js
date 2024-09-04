import { tl_slider } from "./slider.js";

export class Timeline {

    constructor(_config) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 1200,
            containerHeight: _config.containerHeight || 75,
            margin: {top: 5, right: 5, bottom: 20, left: 5},
            timeframe: _config.timeframe || {start: new Date(2022, 0 ,1), end: new Date(2023, 11, 31)}
        }

        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        vis.svg = d3.select(vis.config.parentElement).append('svg')
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);
        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left}, ${vis.config.margin.top})`);
        
        let layout = {
            width: vis.config.containerWidth,
            height: vis.config.containerHeight,
            margin: vis.config.margin
        };
        vis.slider = tl_slider(vis.config.timeframe.start, vis.config.timeframe.end, layout, vis);

        vis.xScale = d3.scaleUtc()
            .range([0, vis.width])
            .domain([vis.config.timeframe.start, vis.config.timeframe.end]);
        vis.yScale = d3.scaleLinear()
            .range([vis.height, 0]);
        
        vis.xAxis = d3.axisBottom(vis.xScale)
            .tickSize(0)
            .ticks(9);
        
        vis.xAxisGroup = vis.chart.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0, ${vis.height})`);
        
        vis.xAxisGroup.call(vis.xAxis)
            .selectAll('text')
            .attr('transform', `translate(10, 5)`);
    }

    updateVis() {
        let vis = this;

        vis.yScale.domain([0, d3.max(vis.data, d => d.Activity)]);

        vis.renderVis();
    }

    renderVis() {
        let vis = this;

        vis.bars = vis.chart.selectAll('rect')
            .data(vis.data)
            .join(
                enter => enter.append('rect'),
                update => update,
                exit => exit.remove()
            )
                .attr('class', 'bar')
                .attr('x', 1)
                .attr('transform', d => `translate(${vis.xScale(d.Date)}, ${vis.yScale(d.Activity)})`)
                .attr('opacity', d => (vis.config.timeframe.start <= d.Date && d.Date <= vis.config.timeframe.end) ? 1 : .2)
                .attr('height', d => vis.height - vis.yScale(d.Activity))
                .attr('width', d => vis.xScale(d3.utcDay.offset(d.Date, 1)) - vis.xScale(d.Date) - 1)
        
        vis.svg.node().dispatchEvent(new CustomEvent('rendered', {detail: {tframe: vis.config.timeframe}}));
    }

}