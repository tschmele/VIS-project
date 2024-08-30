export class ChannelChart {

    constructor(_config) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 500,
            containerHeight: _config.containerHeight || 300,
            margin: {top: 20, right: 30, bottom: 30, left: 40},
            timeframe: _config.timeframe || {start: new Date(2022, 0 ,1), end: new Date(2023, 11, 31)},
            col: _config.col || 'MAIN/general'
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
        
        vis.xScale = d3.scaleUtc()
            .range([0, vis.width])
            .domain([vis.config.timeframe.start, vis.config.timeframe.end]);
        vis.yScale = d3.scaleLinear()
            .range([vis.height, 0]);
        
        vis.xAxis = d3.axisBottom(vis.xScale)
            .tickSize(5)
            .tickSizeOuter(0)
            .ticks(9);
        vis.yAxis = d3.axisLeft(vis.yScale)
            .tickSize(5)
            .ticks(10);

        vis.line = d3.line()
            .x(d => vis.xScale(d.x0) + 1)
            .y(d => vis.yScale(d[0][vis.config.col]))
            .curve(d3.curveMonotoneX);
        vis.area = d3.area()
            .x(d => vis.xScale(d.x0) + 1)
            .y1(d => vis.yScale(d[0][vis.config.col]))
            .y0(vis.height)
            .curve(d3.curveMonotoneX);
        
        vis.xAxisGroup = vis.chart.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0, ${vis.height})`);
        vis.yAxisGroup = vis.chart.append('g')
            .attr('class', 'axis y-axis');
        
        vis.xAxisGroup.call(vis.xAxis)
            .selectAll('text')
            .attr('transform', `translate(0, 5)`);
    }

    updateVis() {
        let vis = this;

        vis.xScale.domain([vis.config.timeframe.start, vis.config.timeframe.end]);
        vis.yScale.domain([0, d3.max(vis.data, d => d[0][vis.config.col])])

        vis.renderVis();
    }

    renderVis() {
        let vis = this;

        vis.yAxisGroup.call(vis.yAxis);

        vis.chart.selectAll('path')
            .remove();

        vis.chart.append('path')
            .attr('d', vis.area(vis.data))
            .attr('class', 'path area');

        vis.chart.append('path')
            .attr('d', vis.line(vis.data))
            .attr('class', 'path line');
    }
}