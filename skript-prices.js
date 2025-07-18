const efficiencyMatrix = {
            16: { to: 15, pricePerW: 1.14 },
            17: { to: 16, pricePerW: 1.14 },
            18: { to: 17, pricePerW: 1.14 },
            19: { to: 18, pricePerW: 1.14 },
            20: { to: 19, pricePerW: 1.14 },
            21: { to: 20, pricePerW: 1.53 },
            22: { to: 21, pricePerW: 1.53 },
            23: { to: 22, pricePerW: 1.53 },
            24: { to: 23, pricePerW: 1.53 },
            25: { to: 24, pricePerW: 1.53 },
            26: { to: 25, pricePerW: 1.53 },
            27: { to: 26, pricePerW: 1.53 },
            28: { to: 27, pricePerW: 1.53 },
            29: { to: 28, pricePerW: 0.40 },
            30: { to: 29, pricePerW: 0.40 },
            31: { to: 30, pricePerW: 0.40 },
            32: { to: 31, pricePerW: 0.40 },
            33: { to: 32, pricePerW: 0.40 },
            34: { to: 33, pricePerW: 0.40 },
            35: { to: 34, pricePerW: 0.40 },
            36: { to: 35, pricePerW: 0.34 },
            37: { to: 36, pricePerW: 0.34 },
            38: { to: 37, pricePerW: 0.34 },
            39: { to: 38, pricePerW: 0.34 },
            40: { to: 39, pricePerW: 0.34 },
            41: { to: 40, pricePerW: 0.34 },
            42: { to: 41, pricePerW: 0.34 },
            43: { to: 42, pricePerW: 0.34 },
            44: { to: 43, pricePerW: 0.34 },
            45: { to: 44, pricePerW: 0.34 },
            46: { to: 45, pricePerW: 0.34 },
            47: { to: 46, pricePerW: 0.34 },
            48: { to: 47, pricePerW: 0.34 },
            49: { to: 48, pricePerW: 0.34 },
            50: { to: 49, pricePerW: 0.34 }
        };

/*const efficiencyMatrix 16.07.2025= {
            16: { to: 15, pricePerW: 1.16 },
            17: { to: 16, pricePerW: 1.16 },
            18: { to: 17, pricePerW: 1.16 },
            19: { to: 18, pricePerW: 1.16 },
            20: { to: 19, pricePerW: 1.16 },
            21: { to: 20, pricePerW: 1.52 },
            22: { to: 21, pricePerW: 1.52 },
            23: { to: 22, pricePerW: 1.52 },
            24: { to: 23, pricePerW: 1.52 },
            25: { to: 24, pricePerW: 1.52 },
            26: { to: 25, pricePerW: 1.52 },
            27: { to: 26, pricePerW: 1.52 },
            28: { to: 27, pricePerW: 1.52 },
            29: { to: 28, pricePerW: 0.40 },
            30: { to: 29, pricePerW: 0.40 },
            31: { to: 30, pricePerW: 0.40 },
            32: { to: 31, pricePerW: 0.40 },
            33: { to: 32, pricePerW: 0.40 },
            34: { to: 33, pricePerW: 0.40 },
            35: { to: 34, pricePerW: 0.40 },
            36: { to: 35, pricePerW: 0.34 },
            37: { to: 36, pricePerW: 0.34 },
            38: { to: 37, pricePerW: 0.34 },
            39: { to: 38, pricePerW: 0.34 },
            40: { to: 39, pricePerW: 0.34 },
            41: { to: 40, pricePerW: 0.34 },
            42: { to: 41, pricePerW: 0.34 },
            43: { to: 42, pricePerW: 0.34 },
            44: { to: 43, pricePerW: 0.34 },
            45: { to: 44, pricePerW: 0.34 },
            46: { to: 45, pricePerW: 0.34 },
            47: { to: 46, pricePerW: 0.34 },
            48: { to: 47, pricePerW: 0.34 },
            49: { to: 48, pricePerW: 0.34 },
            50: { to: 49, pricePerW: 0.34 }
        };
       const efficiencyMatrix02.07.2025 = {
            16: { to: 15, pricePerW: 1.16 },
            17: { to: 16, pricePerW: 1.16 },
            18: { to: 17, pricePerW: 1.16 },
            19: { to: 18, pricePerW: 1.16 },
            20: { to: 19, pricePerW: 1.16 },
            21: { to: 20, pricePerW: 1.42 },
            22: { to: 21, pricePerW: 1.42 },
            23: { to: 22, pricePerW: 1.42 },
            24: { to: 23, pricePerW: 1.42 },
            25: { to: 24, pricePerW: 1.42 },
            26: { to: 25, pricePerW: 1.42 },
            27: { to: 26, pricePerW: 1.42 },
            28: { to: 27, pricePerW: 1.42 },
            29: { to: 28, pricePerW: 0.52 },
            30: { to: 29, pricePerW: 0.52 },
            31: { to: 30, pricePerW: 0.52 },
            32: { to: 31, pricePerW: 0.52 },
            33: { to: 32, pricePerW: 0.52 },
            34: { to: 33, pricePerW: 0.52 },
            35: { to: 34, pricePerW: 0.52 },
            36: { to: 35, pricePerW: 0.34 },
            37: { to: 36, pricePerW: 0.34 },
            38: { to: 37, pricePerW: 0.34 },
            39: { to: 38, pricePerW: 0.34 },
            40: { to: 39, pricePerW: 0.34 },
            41: { to: 40, pricePerW: 0.34 },
            42: { to: 41, pricePerW: 0.34 },
            43: { to: 42, pricePerW: 0.34 },
            44: { to: 43, pricePerW: 0.34 },
            45: { to: 44, pricePerW: 0.34 },
            46: { to: 45, pricePerW: 0.34 },
            47: { to: 46, pricePerW: 0.34 },
            48: { to: 47, pricePerW: 0.34 },
            49: { to: 48, pricePerW: 0.34 },
            50: { to: 49, pricePerW: 0.34 }
        };
       
       const efficiencyMatrix21.06.2025 = {
            16: { to: 15, pricePerW: 1.16 },
            17: { to: 16, pricePerW: 1.16 },
            18: { to: 17, pricePerW: 1.16 },
            19: { to: 18, pricePerW: 1.16 },
            20: { to: 19, pricePerW: 1.16 },
            21: { to: 20, pricePerW: 1.13 },
            22: { to: 21, pricePerW: 1.13 },
            23: { to: 22, pricePerW: 1.13 },
            24: { to: 23, pricePerW: 1.13 },
            25: { to: 24, pricePerW: 1.13 },
            26: { to: 25, pricePerW: 1.13 },
            27: { to: 26, pricePerW: 1.13 },
            28: { to: 27, pricePerW: 1.13 },
            29: { to: 28, pricePerW: 0.72 },
            30: { to: 29, pricePerW: 0.72 },
            31: { to: 30, pricePerW: 0.72 },
            32: { to: 31, pricePerW: 0.72 },
            33: { to: 32, pricePerW: 0.72 },
            34: { to: 33, pricePerW: 0.72 },
            35: { to: 34, pricePerW: 0.72 },
            36: { to: 35, pricePerW: 0.29 },
            37: { to: 36, pricePerW: 0.29 },
            38: { to: 37, pricePerW: 0.29 },
            39: { to: 38, pricePerW: 0.29 },
            40: { to: 39, pricePerW: 0.29 },
            41: { to: 40, pricePerW: 0.29 },
            42: { to: 41, pricePerW: 0.29 },
            43: { to: 42, pricePerW: 0.29 },
            44: { to: 43, pricePerW: 0.29 },
            45: { to: 44, pricePerW: 0.29 },
            46: { to: 45, pricePerW: 0.29 },
            47: { to: 46, pricePerW: 0.29 },
            48: { to: 47, pricePerW: 0.29 },
            49: { to: 48, pricePerW: 0.29 },
            50: { to: 49, pricePerW: 0.29 }
        } */
