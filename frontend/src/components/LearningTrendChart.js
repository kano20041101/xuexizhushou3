import React from 'react';
import ReactECharts from 'echarts-for-react';

const LearningTrendChart = ({ data = [], title = '学习时长趋势' }) => {
  const chartData = data;

  // 空数据状态
  if (chartData.length === 0) {
    return (
      <div className="chart-empty-state">
        <p>暂无学习时长数据</p>
      </div>
    );
  }

  const option = {
    title: {
      text: title,
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        return `${params[0].name}<br/>学习时长: ${params[0].value}分钟`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: chartData.map(item => item.name),
      axisLabel: {
        rotate: 45,
        fontSize: 12
      }
    },
    yAxis: {
      type: 'value',
      name: '学习时长(分钟)',
      minInterval: 30,
      axisLabel: {
        fontSize: 12
      }
    },
    series: [
      {
        name: '学习时长',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: '#4a90e2'
        },
        itemStyle: {
          color: '#4a90e2',
          borderColor: '#fff',
          borderWidth: 2
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(74, 144, 226, 0.5)' },
              { offset: 1, color: 'rgba(74, 144, 226, 0.1)' }
            ]
          }
        },
        emphasis: {
          focus: 'series'
        },
        data: chartData.map(item => item.value)
      }
    ]
  };

  return (
    <div className="learning-trend-chart">
      <ReactECharts option={option} style={{ height: '400px', width: '100%' }} />
    </div>
  );
};

export default LearningTrendChart;
