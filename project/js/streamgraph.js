export class Streamgraph {

    constructor(_config) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 460,
            containerHeight: _config.containerHeight || 400,
            margin: {top: 20, right: 30, bottom: 0, left: 10},
            timeframe: _config.timeframe || {start: new Date(2022, 0 ,1), end: new Date(2023, 11, 31)},
            highlight: _config.highlight || None
        }

        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        vis.svg = d3.select(vis.config.parentElement).append('svg')
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight)
            .append('g')
            .attr('transform', `translate(${vis.config.margin.left}, ${vis.config.margin.top})`);
        
        vis.xScale = d3.scaleUtc()
            .domain([vis.config.timeframe.start, vis.config.timeframe.end])
            .range([0, vis.width]);
        
        vis.xAxisGroup = vis.svg.append('g')
            // .attr('class', 'axis x-axis')
            .attr('transform', `translate(0, ${vis.height*.8})`)
            .call(d3.axisBottom(vis.xScale).tickSize(-vis.height*.7).ticks(8))
            .select('.domain').remove()

        vis.svg.selectAll(".tick line").attr("stroke", "#b8b8b8")
        
        vis.svg.append('text')
            .attr('text-anchor', 'end')
            .attr('x', vis.width)
            .attr('y', vis.height-30 )
            .text('Time (year)')

        vis.yScale = d3.scaleLinear()
            .domain([-150000, 150000])
            .range([vis.height, 0]);

        vis.color = d3.scaleSequential(d3.interpolateMagma);

        vis.Tooltip = vis.svg.append("text")
            .attr("x", 0)
            .attr("y", 0)
            .style("opacity", 0)
            .style("font-size", 17)
        
        // Three function that change the tooltip when user hover / move / leave a cell
        vis.mouseover = function(d) {
            vis.Tooltip.style("opacity", 1)
            d3.selectAll(".myArea").style("opacity", .2)
            d3.select(this)
                .style("stroke", "black")
                .style("opacity", 1)
        }
        vis.mousemove = function(d,i) {
            vis.Tooltip.text(i.key)
        }
        vis.mouseleave = function(d) {
            vis.Tooltip.style("opacity", 0)
            d3.selectAll(".myArea").style("opacity", 1).style("stroke", "none")
        }

        vis.area = d3.area()
            .x(d => vis.xScale(d.data.Date))
            .y0(d => vis.yScale(d[0]))
            .y1(d => vis.yScale(d[1]));
    }

    updateVis() {
        let vis = this;

        vis.xScale.domain([vis.config.timeframe.start, vis.config.timeframe.end]);

        vis.renderVis();
    }

    renderVis() {
        let vis = this;
        
        vis.svg.selectAll('mylayers')
            .data(vis.data)
            .enter()
            .append('path')
                .attr('class', 'myArea')
                .style('fill', d => (d.key == vis.config.highlight) ? vis.color(.75) : vis.color(.5))
                .attr('d', vis.area)
                .on("mouseover", vis.mouseover)
                .on("mousemove", vis.mousemove)
                .on("mouseleave", vis.mouseleave);
    }
}