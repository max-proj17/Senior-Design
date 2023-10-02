import React, { useEffect, useState, useMemo, memo, useRef, useCallback } from 'react';
import axios from 'axios';
import ApexCharts from 'react-apexcharts';

function TemperatureMonitor() {
    //Define variables and function links
  const [temperature, setTemperature] = useState(null);
  const [error, setError] = useState(null);
  const [temperatureData, setTemperatureData] = useState(Array(300).fill(null));
  const [smsMessage, setSmsMessage] = useState({
    maxTempMessage: "Warning: Temperature exceeded {maxTemperature} C",
    minTempMessage: "Warning: Temperature dropped below {minTemperature} C",
    phoneNumber: 'Your_Phone_#_Here',
  });
  const [tempUnit, setTempUnit] = useState('C');
  const smsMessageRef = useRef(smsMessage);
  const chartContainerRef = useRef(null); // Create a ref for the chart container
  // Function to toggle temperature unit
  // const toggleTempUnit = () => {
  //   setTempUnit((prevUnit) => (prevUnit === 'C' ? 'F' : 'C'));
  // };
  
  useEffect(() => {
    smsMessageRef.current = smsMessage;
  }, [smsMessage]);

  useEffect(() => {
    const apiUrl = 'http://localhost:3000/temperature';
    
    const fetchTemperature = () => {
        axios.get(apiUrl)
          .then(response => {
            setTemperature(response.data.temperature);
            setError(null);
            setTemperatureData(prevData => {
                const newData = prevData.slice(1);
                newData.push(response.data.temperature);
                return newData;
            });

        })
          .catch(error => {
            console.error("Error fetching temperature", error);
            setTemperature(null); // Clear the temperature state on error
            if (error.response && error.response.data.error) {
              setError(error.response.data.error);
              console.log("Error message from server:", error.response.data.error); // Log the error message from the server
            } else {
              setError('Temperature not available');
            }
            // Continue updating the temperatureData array with null values when the sensor is unplugged
            setTemperatureData(prevData => {
                const newData = prevData.slice(1);
                newData.push(null); // Push null to create a gap in the chart
                return newData;
            });
          });
      };
    
    fetchTemperature();
    const intervalId = setInterval(fetchTemperature, 1000);

    return () => clearInterval(intervalId);
  }, []);

  
  //Handle SMS components
  const handleSmsMessageChange = useCallback((e) => {
    const { name, value } = e.target;
    setSmsMessage((prevMessage) => ({
      ...prevMessage,
      [name]: value,
    }));
    axios.post('http://localhost:3000/updateSmsMessage', {
      [name]: value,
    }).catch(error => {
      console.error("Error updating SMS message", error);
    });
  }, []);

  //Handle button logic
  const handleButtonPress = () => {
    axios.post('http://localhost:3000/display/press')
      .catch(error => {
        console.error("Error turning on display", error);
      });
  };
  
  const handleButtonRelease = () => {
    axios.post('http://localhost:3000/display/release')
      .catch(error => {
        console.error("Error turning off display", error);
      });
  };

  //Set up the graph
  const chartOptions = useMemo(() => {
    const isCelsius = tempUnit === 'C';
    const yAxisMin = isCelsius ? 10 : 50; // 10°C or 50°F
    const yAxisMax = isCelsius ? 50 : 122; // 50°C or 122°F
    
  
    // Create an array of categories that shows the most recent 300 points
    const categories = Array.from({ length: 300 }, (_, i) => 300 - i);
    return {
      chart: {
        id: 'temperature-chart',
        type: 'line',
        // Add responsive breakpoints
        responsive: [
          {
            breakpoint: 600, // For small screens (e.g., small laptops, tablets)
            options: {
              chart: {
                height: 300, // Adjust the height of the chart
              },
              // Additional adjustments can be made here as needed
            },
          },
          {
            breakpoint: 900, // For medium screens (e.g., average laptops, desktops)
            options: {
              chart: {
                height: 400, // Adjust the height of the chart
              },
              // Additional adjustments can be made here as needed
            },
          },
          {
            breakpoint: 1200, // For large screens (e.g., large desktop monitors)
            options: {
              chart: {
                height: 500, // Adjust the height of the chart
              },
              // Additional adjustments can be made here as needed
            },
          },
        ],
        animations: {
          enabled: true, // Enable or disable animations
          easing: 'easeinout', // Easing type for animations
          speed: 300, // Animation speed
          animateGradually: {
            enabled: true,
            delay: 150,
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350,
          },
        }, 
      },
      xaxis: {
        categories: categories,
        labels: {
          style: {
            colors: '#ffffff', // Set the color of the x-axis labels to white
          },
          formatter: (value) => {
            // Only label every 100th point
            return value % 100 === 0 ? value : '';
          },
        },
      },
      yaxis: {
        min: yAxisMin,
        max: yAxisMax,
        title: {
          text: `Temperature (°${tempUnit})`,
        },
        labels: {
          style: {
            colors: '#ffffff', // Set the color of the y-axis labels to white
          },
        },
      },
    };
  }, [tempUnit]); // Empty dependency array as chartOptions does not depend on any state or props

  //Handle HTML formating of all components
  return (
    <div>
      {error ? (
        <p>{error}</p>
      ) : temperature !== null ? (
        <p>Current Temperature: {temperature} °C</p>
      ) : (
        <p>Temperature not available</p>
      )}
      <button onMouseDown={handleButtonPress} onMouseUp={handleButtonRelease}>Hold to Display</button>
      {temperatureData && temperatureData.length > 0 ? (
        <div ref={chartContainerRef} style={{ width: '600px'}}>
          <ApexCharts options={chartOptions} series={[{ data: temperatureData }]} type="line" height={400} width={1200} />
        </div>
      ) : (
        <div style={{ height: '400px', width: '600px', border: '1px solid #ccc' }}>
          {/* Empty space or placeholder for the graph */}
        </div>
      )}
      <label>
        Max Temperature Message:
        <input
          type="text"
          name="maxTempMessage"
          value={smsMessage.maxTempMessage}
          onChange={handleSmsMessageChange}
        />
      </label>
      <label>
        Min Temperature Message:
        <input
          type="text"
          name="minTempMessage"
          value={smsMessage.minTempMessage}
          onChange={handleSmsMessageChange}
        />
      </label>
      <label>
        Phone Number:
        <input
          type="text"
          name="phoneNumber"
          value={smsMessage.phoneNumber}
          onChange={handleSmsMessageChange}
        />
      </label>
    </div>
  );
  
}

export default memo(TemperatureMonitor);
