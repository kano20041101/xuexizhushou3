import React from 'react';
import ReactECharts from 'echarts-for-react';

const KnowledgeMasteryRadar = ({ data = [], title = '知识点掌握分布' }) => {
  const chartData = data;

  // 空数据状态
  if (chartData.length === 0) {
    return (
      <div className="chart-empty-state">
        <p>暂无知识点掌握数据</p>
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
      trigger: 'item',
      formatter: function(params) {
        return `${params.name}<br/>掌握率: ${params.value}%`;
      }
    },
    radar: {
      indicator: chartData.map(item => ({
        name: item.pointName,
        max: 100,
        nameGap: 15
      })),
      radius: '70%',
      center: ['50%', '55%'],
      splitNumber: 5,
      splitArea: {
        areaStyle: {
          color: ['rgba(255,255,255,0.9)', 'rgba(240,240,240,0.9)']
        }
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(0,0,0,0.1)'
        }
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(0,0,0,0.1)'
        }
      },
      name: {
        textStyle: {
          fontSize: 12
        }
      }
    },
    series: [
      {
        name: '知识点掌握率',
        type: 'radar',
        data: [
          {
            value: chartData.map(item => item.masteryRate),
            name: '掌握率',
            areaStyle: {
              color: 'rgba(74, 144, 226, 0.3)'
            },
            lineStyle: {
              width: 3,
              color: '#4a90e2'
            },
            itemStyle: {
              color: '#4a90e2',
              borderColor: '#fff',
              borderWidth: 2,
              shadowBlur: 5,
              shadowColor: 'rgba(74, 144, 226, 0.5)'
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(74, 144, 226, 0.7)'
              }
            }
          }
        ]
      }
    ]
  };

  return (
    <div className="knowledge-mastery-radar">
      <ReactECharts option={option} style={{ height: '400px', width: '100%' }} />
    </div>
  );
};

export default KnowledgeMasteryRadar;
