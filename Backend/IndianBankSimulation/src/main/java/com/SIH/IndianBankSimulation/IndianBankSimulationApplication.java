package com.SIH.IndianBankSimulation;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class IndianBankSimulationApplication {

	public static void main(String[] args) {
		SpringApplication.run(IndianBankSimulationApplication.class, args);
	}

}
