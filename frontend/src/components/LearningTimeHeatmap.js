import React from 'react';
import ReactECharts from 'echarts-for-react';

const LearningTimeHeatmap = ({ data = [], title = '学习时间分布热力图' }) => {
  const chartData = data;

  // 空数据状态
  if (chartData.length === 0) {
    return (
      <div className="chart-empty-state">
        <p>暂无学习时间分布数据</p>
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
      position: 'top',
      formatter: function(params) {
        const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        const hours = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
        return `${days[params.value[0]]} ${hours[params.value[1]]} - ${hours[params.value[1] + 1]}<br/>学习时长: ${params.value[2]}分钟`;
      }
    },
    grid: {
      height: '70%',
      top: '15%',
      left: '8%',
      right: '8%'
    },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(255,255,255,0.9)', 'rgba(240,240,240,0.9)']
        }
      },
      axisLabel: {
        fontSize: 12
      }
    },
    yAxis: {
      type: 'category',
      data: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(255,255,255,0.9)', 'rgba(240,240,240,0.9)']
        }
      },
      axisLabel: {
        fontSize: 12
      }
    },
    visualMap: {
      min: 0,
      max: 200,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '5%',
      inRange: {
        color: ['#e0f2f1', '#80deea', '#4db6ac', '#009688', '#00796b']
      },
      textStyle: {
        fontSize: 12
      }
    },
    series: [
      {
        name: '学习时长',
        type: 'heatmap',
        data: chartData,
        label: {
          show: true,
          fontSize: 10,
          formatter: '{c}'
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        blurSize: 1,
        progressive: 500,
        progressiveThreshold: 3000
      }
    ]
  };

  return (
    <div className="learning-time-heatmap">
      <ReactECharts option={option} style={{ height: '500px', width: '100%' }} />
    </div>
  );
};

export default LearningTimeHeatmap;
