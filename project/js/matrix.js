export class Matrix {

    constructor(_config) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 500,
            containerHeight: _config.containerHeight || 600,
            margin: {top: 20, right: 5, bottom: 20, left: 200}
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
        
        vis.xScale = d3.scalePoint()
            .range([0, vis.width])
            .padding(1);
        
        vis.yScale = d3.scalePoint()
            .range([vis.height, 0]);

        vis.myLines = vis.chart.append('svg')
            .attr('width', vis.width)
            .attr('height', vis.height);
        
        vis.axisGroup = vis.chart.append('g')
        
        vis.color = d3.scaleSequential(d3.interpolateMagma);
    }

    updateVis() {
        let vis = this;

        vis.xScale.domain(vis.data.dimensions);
        vis.yScale.domain(vis.data.channels);


        vis.renderVis()
    }

    renderVis() {
        let vis = this;

        vis.myLines.selectAll('line').remove();

        vis.myLines.selectAll('line')
            .data(vis.data.data)
            .enter()
            .append('line')
                .style('fill', 'none')
                .style('stroke', d => vis.color(vis.data.channels.indexOf(d.c2) / vis.data.channels.length))
                .style('stroke-width', d => Math.log(d.sum) + 1)
                .style('opacity', d => (d.c1 == '' || d.c2 == '') ? 0 : 1)
                .attr('x1', d => vis.xScale(d.t0))
                .attr('x2', d => vis.xScale(d.t1))
                .attr('y1', d => (d.c1 == '' || d.c2 == '') ? 0 : vis.yScale(d.c1))
                .attr('y2', d => (d.c1 == '' || d.c2 == '') ? 0 : vis.yScale(d.c2));
        
        vis.chart.append('g')
            .attr('class', 'axis y-axis')
            .attr('transform', `translate(${vis.xScale(vis.data.dimensions[0])})`)
            .call(d3.axisLeft().scale(vis.yScale).tickSize(5).tickFormat((d, i) => {
                let index = vis.data.channels.indexOf(d);
                return vis.data.labels[index];
            }))
            .append('text')
                .style('text-anchor', 'middle')
                .attr('y', -9)
                .text(vis.data.dimensions.shift().getHours() + ':00')
                .style('fill', 'white')
                .style('opacity', .87);
            
        vis.axisGroup.selectAll('g')
            .data(vis.data.dimensions)
            .enter()
            .append('g')
                .attr('class', 'axis y-axis')
                .attr('transform', d => `translate(${vis.xScale(d)})`)
                .call(d3.axisLeft().scale(vis.yScale).tickSize(5).tickFormat(''))
                // .each(d => (d == vis.data.dimensions[0]) ? d3.select(this).call(d3.axisLeft().scale(vis.yScale).tickSize(5)) : d3.select(this).call(d3.axisLeft().scale(vis.yScale).tickSize(5).tickValues([...Array(vis.data.channels).keys()])));
                .append('text')
                    .style('text-anchor', 'middle')
                    .attr('y', -9)
                    .text(d => d.getHours() + ':00')
                    .style('fill', 'white')
                    .style('opacity', .87);
        
    }
}